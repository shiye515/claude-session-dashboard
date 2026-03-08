'use client'

import { useCallback, useEffect, useState } from 'react'

interface Log {
  id: string
  provider: string
  endpoint: string
  method: string
  requestHeaders: Record<string, unknown>
  requestBody: Record<string, unknown>
  responseStatus: number
  responseHeaders: Record<string, unknown>
  responseBody: Record<string, unknown>
  isStreaming: boolean
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  durationMs: number | null
  model: string | null
  createdAt: Date | string
}

interface LogsResponse {
  logs: Log[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Provider list for filtering
const PROVIDERS = ['openai', 'anthropic', 'dashscope', 'deepseek', 'moonshot', 'zhipu']

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [page, setPage] = useState(1)
  const [provider, setProvider] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(provider && { provider }),
        ...(search && { search }),
      })
      const response = await fetch(`/api/logs?${params}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }, [page, provider, search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleClearLogs = async () => {
    if (!confirm('确定要清空所有日志吗？此操作不可恢复。')) return

    try {
      await fetch('/api/logs', { method: 'DELETE' })
      fetchLogs()
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  // Dynamically import LogTable and LogDetail to avoid SSR issues
  const [LogTable, setLogTable] = useState<React.ComponentType<{
    logs: Log[]
    onRowClick?: (log: Log) => void
  }> | null>(null)
  const [LogDetail, setLogDetail] = useState<React.ComponentType<{
    log: Log | null
    open: boolean
    onOpenChange: (open: boolean) => void
  }> | null>(null)

  useEffect(() => {
    import('@/components/logs/log-table').then((mod) => setLogTable(() => mod.LogTable))
    import('@/components/logs/log-detail').then((mod) => setLogDetail(() => mod.LogDetail))
  }, [])

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">历史记录</h1>
          <p className="text-muted-foreground">查看所有 API 请求日志</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={handleClearLogs}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          清空日志
        </button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="搜索端点、模型或提供商..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                onClick={handleSearch}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </div>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value)
                setPage(1)
              }}
              className="flex h-9 w-[150px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">全部提供商</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-6 pt-0">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">加载中...</div>
          ) : data?.logs ? (
            <>
              {LogTable && <LogTable logs={data.logs} onRowClick={setSelectedLog} />}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">共 {data.pagination.total} 条记录</div>
                  <div className="flex gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      上一页
                    </button>
                    <span className="flex items-center px-2 text-sm">
                      {page} / {data.pagination.totalPages}
                    </span>
                    <button
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                      disabled={page >= data.pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">暂无数据</div>
          )}
        </div>
      </div>

      {LogDetail && (
        <LogDetail log={selectedLog} open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)} />
      )}
    </div>
  )
}
