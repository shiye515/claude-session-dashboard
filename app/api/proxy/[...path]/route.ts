import { NextRequest } from 'next/server'
import { handleOpenAIProxy } from '@/lib/proxy/openai'
import { handleAnthropicProxy } from '@/lib/proxy/anthropic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params)
}

async function handleProxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>
) {
  const { path } = await params

  if (!path || path.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const provider = path[0].toLowerCase()
  const remainingPath = path.slice(1)

  switch (provider) {
    case 'openai':
      return handleOpenAIProxy(request, remainingPath)
    case 'anthropic':
      return handleAnthropicProxy(request, remainingPath)
    default:
      return new Response(
        JSON.stringify({
          error: `Unknown provider: ${provider}. Use 'openai' or 'anthropic'`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
  }
}