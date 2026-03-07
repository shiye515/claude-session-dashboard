import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  return handleProxy(request)
}

export async function POST(request: NextRequest) {
  return handleProxy(request)
}

export async function PUT(request: NextRequest) {
  return handleProxy(request)
}

export async function DELETE(request: NextRequest) {
  return handleProxy(request)
}

export async function PATCH(request: NextRequest) {
  return handleProxy(request)
}

async function handleProxy(request: NextRequest) {
  const startTime = Date.now()

  // Get target URL from query parameter
  const targetUrl = request.nextUrl.searchParams.get('target')

  if (!targetUrl) {
    return new Response(JSON.stringify({
      error: 'Missing target URL. Usage: /api/proxy?target=https://api.example.com/endpoint'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Validate target URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch {
    return new Response(JSON.stringify({
      error: 'Invalid target URL'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get request headers (forward all except host)
  const requestHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (lowerKey !== 'host' && lowerKey !== 'content-length') {
      requestHeaders[key] = value
    }
  })

  // Mask sensitive headers for logging
  const maskedHeaders = maskSensitiveHeaders(requestHeaders)

  // Get request body
  let requestBody: Prisma.InputJsonValue | null = null
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      const text = await request.text()
      requestBody = text ? JSON.parse(text) : null
    } catch {
      requestBody = { _error: 'Failed to parse JSON body' }
    }
  } else if (contentType.includes('multipart/form-data')) {
    requestBody = { _type: 'multipart/form-data', _note: 'Body not logged for multipart' }
  } else {
    try {
      const text = await request.text()
      requestBody = text || null
    } catch {
      requestBody = null
    }
  }

  // Check if streaming request
  const isStreaming = checkIfStreaming(requestBody, requestHeaders)

  // Detect provider from target URL
  const provider = detectProvider(parsedUrl.hostname)

  // Extract model from request body
  const model = extractModel(requestBody, provider)

  try {
    // Forward request to target
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: requestHeaders
    }

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      if (contentType.includes('application/json') && requestBody) {
        fetchOptions.body = JSON.stringify(requestBody)
      } else if (!contentType.includes('multipart/form-data')) {
        // For non-multipart, we can re-read the body
        const clonedRequest = request.clone()
        fetchOptions.body = await clonedRequest.text()
      }
    }

    const response = await fetch(targetUrl, fetchOptions)

    const durationMs = Date.now() - startTime

    // Get response headers
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    let responseBody: Prisma.InputJsonValue | null = null
    let promptTokens: number | null = null
    let completionTokens: number | null = null
    let totalTokens: number | null = null

    const responseContentType = response.headers.get('content-type') || ''

    if (responseContentType.includes('text/event-stream') || isStreaming) {
      // Handle streaming response
      const { stream, collectedData } = await handleStreamingResponse(response)

      // Parse streaming events for usage info
      const usage = extractUsageFromStream(collectedData, provider)
      promptTokens = usage.promptTokens
      completionTokens = usage.completionTokens
      totalTokens = usage.totalTokens

      // Save log asynchronously
      saveLog({
        provider,
        endpoint: parsedUrl.pathname,
        targetHost: parsedUrl.host,
        method: request.method,
        requestHeaders: maskedHeaders,
        requestBody,
        responseStatus: response.status,
        responseHeaders,
        responseBody: { streaming: true, chunks: collectedData.length },
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
      const responseText = await response.text()

      try {
        responseBody = responseText ? JSON.parse(responseText) : null
      } catch {
        responseBody = responseText || null
      }

      // Extract usage from response
      const usage = extractUsageFromResponse(responseBody, provider)
      promptTokens = usage.promptTokens
      completionTokens = usage.completionTokens
      totalTokens = usage.totalTokens

      // Extract model from response if not in request
      const responseModel = extractModelFromResponse(responseBody, provider)
      const finalModel = model || responseModel

      // Save log
      await saveLog({
        provider,
        endpoint: parsedUrl.pathname,
        targetHost: parsedUrl.host,
        method: request.method,
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
        model: finalModel
      })

      return new Response(responseText, {
        status: response.status,
        headers: {
          'Content-Type': responseContentType || 'application/json'
        }
      })
    }
  } catch (error) {
    const durationMs = Date.now() - startTime

    // Log failed request
    await saveLog({
      provider,
      endpoint: parsedUrl.pathname,
      targetHost: parsedUrl.host,
      method: request.method,
      requestHeaders: maskedHeaders,
      requestBody,
      responseStatus: 0,
      responseHeaders: {},
      responseBody: { error: error instanceof Error ? error.message : 'Unknown error' },
      isStreaming: false,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      durationMs,
      model
    })

    return new Response(JSON.stringify({
      error: 'Proxy request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const masked = { ...headers }
  const sensitiveKeys = ['authorization', 'x-api-key', 'anthropic-api-key', 'api-key']

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      const value = masked[key]
      if (value && value.length > 8) {
        masked[key] = `${value.slice(0, 4)}...${value.slice(-4)}`
      }
    }
  }

  return masked
}

function detectProvider(hostname: string): string {
  if (hostname.includes('openai.com')) return 'openai'
  if (hostname.includes('anthropic.com')) return 'anthropic'
  if (hostname.includes('dashscope')) return 'dashscope'
  if (hostname.includes('deepseek')) return 'deepseek'
  if (hostname.includes('moonshot')) return 'moonshot'
  if (hostname.includes('zhipuai')) return 'zhipu'
  return 'unknown'
}

function checkIfStreaming(body: unknown, headers: Record<string, string>): boolean {
  if (body && typeof body === 'object' && 'stream' in body) {
    return body.stream === true
  }
  const accept = headers['accept'] || headers['Accept'] || ''
  return accept.includes('text/event-stream')
}

function extractModel(body: unknown, provider: string): string | null {
  if (!body || typeof body !== 'object') return null

  const obj = body as Record<string, unknown>

  // Common model field names
  if (obj.model && typeof obj.model === 'string') return obj.model

  return null
}

function extractModelFromResponse(body: unknown, provider: string): string | null {
  if (!body || typeof body !== 'object') return null

  const obj = body as Record<string, unknown>

  if (obj.model && typeof obj.model === 'string') return obj.model

  // OpenAI response format
  if (provider === 'openai' && obj.model) return String(obj.model)

  // Anthropic response format
  if (provider === 'anthropic') {
    if (obj.model) return String(obj.model)
    if (obj.message && typeof obj.message === 'object') {
      const msg = obj.message as Record<string, unknown>
      if (msg.model) return String(msg.model)
    }
  }

  return null
}

function extractUsageFromStream(chunks: string[], provider: string): {
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
} {
  let promptTokens = 0
  let completionTokens = 0

  for (const chunk of chunks) {
    try {
      const data = JSON.parse(chunk)

      // OpenAI format
      if (data.usage) {
        promptTokens = data.usage.prompt_tokens || promptTokens
        completionTokens = data.usage.completion_tokens || completionTokens
      }

      // Anthropic format
      if (data.message?.usage) {
        promptTokens = data.message.usage.input_tokens || promptTokens
        completionTokens = data.message.usage.output_tokens || completionTokens
      }
      if (data.usage?.input_tokens) {
        promptTokens = data.usage.input_tokens
      }
      if (data.usage?.output_tokens) {
        completionTokens += data.usage.output_tokens
      }
    } catch {
      // Ignore parse errors
    }
  }

  return {
    promptTokens: promptTokens || null,
    completionTokens: completionTokens || null,
    totalTokens: (promptTokens && completionTokens) ? promptTokens + completionTokens : null
  }
}

function extractUsageFromResponse(body: unknown, provider: string): {
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
} {
  if (!body || typeof body !== 'object') return { promptTokens: null, completionTokens: null, totalTokens: null }

  const obj = body as Record<string, unknown>

  // OpenAI format
  if (obj.usage && typeof obj.usage === 'object') {
    const usage = obj.usage as Record<string, unknown>
    const promptTokens = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : null
    const completionTokens = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : null
    const totalTokens = typeof usage.total_tokens === 'number' ? usage.total_tokens : null
    return { promptTokens, completionTokens, totalTokens }
  }

  // Anthropic format
  if (obj.usage && typeof obj.usage === 'object') {
    const usage = obj.usage as Record<string, unknown>
    const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : null
    const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : null
    return {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: (inputTokens && outputTokens) ? inputTokens + outputTokens : null
    }
  }

  return { promptTokens: null, completionTokens: null, totalTokens: null }
}

async function handleStreamingResponse(response: Response): Promise<{
  stream: ReadableStream<Uint8Array>
  collectedData: string[]
}> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const chunks: string[] = []
  const decoder = new TextDecoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          controller.enqueue(value)

          const text = decoder.decode(value, { stream: true })
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

  return { stream, collectedData: chunks }
}

interface LogData {
  provider: string
  endpoint: string
  targetHost: string
  method: string
  requestHeaders: Record<string, string>
  requestBody: Prisma.InputJsonValue | null
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody: Prisma.InputJsonValue | null
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
        endpoint: `${data.targetHost}${data.endpoint}`,
        method: data.method,
        requestHeaders: data.requestHeaders,
        requestBody: data.requestBody ?? {},
        responseStatus: data.responseStatus,
        responseHeaders: data.responseHeaders,
        responseBody: data.responseBody ?? {},
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