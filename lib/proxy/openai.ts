import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  parseSSEStream,
  extractOpenAIUsageFromStream,
  type OpenAIStreamEvent
} from './streaming'

const OPENAI_BASE_URL = 'https://api.openai.com'

export async function handleOpenAIProxy(
  request: NextRequest,
  path: string[]
): Promise<Response> {
  const startTime = Date.now()
  const endpoint = '/' + path.join('/')
  const method = request.method

  // Get request headers and body
  const requestHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      requestHeaders[key] = value
    }
  })

  // Mask API key
  const maskedHeaders = maskSensitiveHeaders(requestHeaders)

  let requestBody: Prisma.InputJsonValue = {}
  try {
    const text = await request.text()
    if (text) {
      requestBody = JSON.parse(text)
    }
  } catch {
    requestBody = {}
  }

  const isStreaming = (requestBody as { stream?: boolean })?.stream === true

  // Build target URL
  const targetUrl = `${OPENAI_BASE_URL}${endpoint}`

  // Get API key
  const apiKey = requestHeaders['authorization']?.replace('Bearer ', '') ||
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Forward request
  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  }

  const response = await fetch(targetUrl, {
    method,
    headers: forwardHeaders,
    body: JSON.stringify(requestBody)
  })

  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })

  const durationMs = Date.now() - startTime
  let responseBody: Prisma.InputJsonValue = {}
  let promptTokens: number | null = null
  let completionTokens: number | null = null
  let totalTokens: number | null = null
  let model = (requestBody as { model?: string })?.model || null

  if (isStreaming && response.ok) {
    // Handle streaming response
    const { stream, fullResponse } = await handleStreamingResponse(response)

    // Parse streaming events for usage
    const events: OpenAIStreamEvent[] = []
    for (const data of fullResponse) {
      try {
        events.push(JSON.parse(data))
      } catch {
        // Ignore parse errors
      }
    }

    const usage = extractOpenAIUsageFromStream(events)
    promptTokens = usage.promptTokens
    completionTokens = usage.completionTokens
    totalTokens = usage.totalTokens

    responseBody = { streaming: true, chunks: fullResponse.length }

    // Save log asynchronously
    saveLog({
      provider: 'openai',
      endpoint,
      method,
      requestHeaders: maskedHeaders,
      requestBody,
      responseStatus: response.status,
      responseHeaders,
      responseBody: { chunks: fullResponse },
      isStreaming: true,
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs,
      model
    })

    return new Response(stream, {
      status: response.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } else {
    // Handle non-streaming response
    try {
      const text = await response.text()
      responseBody = text ? JSON.parse(text) : {}
    } catch {
      responseBody = { raw: 'Failed to parse response' }
    }

    // Extract usage from response
    const respBody = responseBody as {
      usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
      }
      model?: string
    }
    if (respBody.usage) {
      promptTokens = respBody.usage.prompt_tokens
      completionTokens = respBody.usage.completion_tokens
      totalTokens = respBody.usage.total_tokens
    }
    if (respBody.model) {
      model = respBody.model
    }

    // Save log
    await saveLog({
      provider: 'openai',
      endpoint,
      method,
      requestHeaders: maskedHeaders,
      requestBody,
      responseStatus: response.status,
      responseHeaders,
      responseBody,
      isStreaming: false,
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs,
      model
    })

    return new Response(JSON.stringify(responseBody), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

async function handleStreamingResponse(response: Response): Promise<{
  stream: ReadableStream<Uint8Array>
  fullResponse: string[]
}> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const chunks: string[] = []
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          controller.enqueue(value)

          // Parse SSE events
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data && data !== '[DONE]') {
                chunks.push(data)
              }
            }
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })

  // Wait a bit to collect some chunks
  await new Promise(resolve => setTimeout(resolve, 100))

  return { stream, fullResponse: chunks }
}

function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const masked = { ...headers }
  if (masked['authorization']) {
    const auth = masked['authorization']
    if (auth.startsWith('Bearer ')) {
      const key = auth.slice(7)
      if (key.length > 8) {
        masked['authorization'] = `Bearer ${key.slice(0, 4)}...${key.slice(-4)}`
      }
    }
  }
  return masked
}

interface LogData {
  provider: 'openai'
  endpoint: string
  method: string
  requestHeaders: Record<string, string>
  requestBody: Prisma.InputJsonValue
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody: Prisma.InputJsonValue
  isStreaming: boolean
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  durationMs: number
  model: string | null
}

async function saveLog(data: LogData): Promise<void> {
  try {
    await prisma.log.create({
      data: {
        provider: data.provider,
        endpoint: data.endpoint,
        method: data.method,
        requestHeaders: data.requestHeaders,
        requestBody: data.requestBody,
        responseStatus: data.responseStatus,
        responseHeaders: data.responseHeaders,
        responseBody: data.responseBody,
        isStreaming: data.isStreaming,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        durationMs: data.durationMs,
        model: data.model
      }
    })
  } catch (error) {
    console.error('Failed to save log:', error)
  }
}