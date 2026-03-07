// Streaming response handler for SSE (Server-Sent Events)

export interface StreamChunk {
  data: string
  done: boolean
}

export function createStreamingParser() {
  let buffer = ''
  const chunks: string[] = []

  return {
    parse(chunk: string): string[] {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      const completeChunks: string[] = []
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            continue
          }
          completeChunks.push(data)
          chunks.push(data)
        }
      }
      return completeChunks
    },

    getBufferedChunks(): string[] {
      return chunks
    },

    getRemainingBuffer(): string {
      return buffer
    }
  }
}

export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        if (buffer.trim()) {
          yield buffer
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data && data !== '[DONE]') {
            yield data
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function createSSETransformer() {
  return new TransformStream<Uint8Array, string>({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk)
      controller.enqueue(text)
    }
  })
}

export interface OpenAIStreamEvent {
  id?: string
  object?: string
  created?: number
  model?: string
  choices?: Array<{
    index: number
    delta: {
      content?: string
      role?: string
      function_call?: {
        name?: string
        arguments?: string
      }
    }
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export interface AnthropicStreamEvent {
  type: string
  index?: number
  delta?: {
    type: string
    text?: string
    partial_json?: string
  }
  message?: {
    id: string
    type: string
    role: string
    content: Array<{
      type: string
      text?: string
    }>
    model: string
    usage: {
      input_tokens: number
      output_tokens: number
    }
  }
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

export function extractOpenAIUsageFromStream(events: OpenAIStreamEvent[]): {
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
} {
  for (const event of events) {
    if (event.usage) {
      return {
        promptTokens: event.usage.prompt_tokens ?? null,
        completionTokens: event.usage.completion_tokens ?? null,
        totalTokens: event.usage.total_tokens ?? null
      }
    }
  }
  return { promptTokens: null, completionTokens: null, totalTokens: null }
}

export function extractAnthropicUsageFromStream(events: AnthropicStreamEvent[]): {
  promptTokens: number | null
  completionTokens: number | null
} {
  let inputTokens = 0
  let outputTokens = 0

  for (const event of events) {
    if (event.message?.usage) {
      return {
        promptTokens: event.message.usage.input_tokens,
        completionTokens: event.message.usage.output_tokens
      }
    }
    if (event.usage) {
      if (event.usage.input_tokens) inputTokens = event.usage.input_tokens
      if (event.usage.output_tokens) outputTokens += event.usage.output_tokens
    }
  }

  return {
    promptTokens: inputTokens || null,
    completionTokens: outputTokens || null
  }
}