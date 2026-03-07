'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

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

interface LogTableProps {
  logs: Log[]
  onRowClick?: (log: Log) => void
}

export function LogTable({ logs, onRowClick }: LogTableProps) {
  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTokens = (tokens: number | null) => {
    if (!tokens) return '-'
    return tokens.toLocaleString()
  }

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge variant="default">{status}</Badge>
    }
    if (status >= 400 && status < 500) {
      return <Badge variant="secondary">{status}</Badge>
    }
    return <Badge variant="destructive">{status}</Badge>
  }

  const getProviderBadge = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'bg-green-50 text-green-700 border-green-200',
      anthropic: 'bg-orange-50 text-orange-700 border-orange-200',
      dashscope: 'bg-blue-50 text-blue-700 border-blue-200',
      deepseek: 'bg-purple-50 text-purple-700 border-purple-200',
      moonshot: 'bg-pink-50 text-pink-700 border-pink-200',
      zhipu: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    }
    const colorClass = colors[provider.toLowerCase()] || 'bg-gray-50 text-gray-700 border-gray-200'
    return (
      <Badge variant="outline" className={colorClass}>
        {provider}
      </Badge>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        暂无数据
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>时间</TableHead>
          <TableHead>提供商</TableHead>
          <TableHead>模型</TableHead>
          <TableHead>端点</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>流式</TableHead>
          <TableHead>输入Token</TableHead>
          <TableHead>输出Token</TableHead>
          <TableHead>耗时</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow
            key={log.id}
            className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
            onClick={() => onRowClick?.(log)}
          >
            <TableCell className="text-sm">
              {new Date(log.createdAt).toLocaleString('zh-CN')}
            </TableCell>
            <TableCell>{getProviderBadge(log.provider)}</TableCell>
            <TableCell className="font-mono text-sm">{log.model || '-'}</TableCell>
            <TableCell className="font-mono text-sm max-w-[200px] truncate" title={log.endpoint}>
              {log.endpoint}
            </TableCell>
            <TableCell>{getStatusBadge(log.responseStatus)}</TableCell>
            <TableCell>
              {log.isStreaming ? (
                <Badge variant="secondary">是</Badge>
              ) : (
                <Badge variant="outline">否</Badge>
              )}
            </TableCell>
            <TableCell>{formatTokens(log.promptTokens)}</TableCell>
            <TableCell>{formatTokens(log.completionTokens)}</TableCell>
            <TableCell>{formatDuration(log.durationMs)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}