'use client'

import { useEffect, useState } from 'react'
import { Log } from '@prisma/client'
import { LogTable } from '@/components/logs/log-table'
import { LogDetail } from '@/components/logs/log-detail'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Trash2 } from 'lucide-react'

interface LogsResponse {
  logs: Log[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [page, setPage] = useState(1)
  const [provider, setProvider] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page, provider])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(provider !== 'all' && { provider }),
        ...(search && { search })
      })
      const response = await fetch(`/api/logs?${params}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
    fetchLogs()
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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">历史记录</h1>
          <p className="text-muted-foreground">查看所有 API 请求日志</p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleClearLogs}>
          <Trash2 className="h-4 w-4 mr-2" />
          清空日志
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="搜索端点或模型..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={provider} onValueChange={(v) => {
              setProvider(v ?? 'all')
              setPage(1)
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="选择提供商" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              加载中...
            </div>
          ) : data?.logs ? (
            <>
              <LogTable
                logs={data.logs}
                onRowClick={setSelectedLog}
              />
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    共 {data.pagination.total} 条记录
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      上一页
                    </Button>
                    <span className="flex items-center px-2 text-sm">
                      {page} / {data.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pagination.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>

      <LogDetail
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      />
    </div>
  )
}