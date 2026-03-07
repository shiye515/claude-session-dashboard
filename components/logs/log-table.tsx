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
import { Log } from '@prisma/client'

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
    return provider === 'openai' ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        OpenAI
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
        Anthropic
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
            <TableCell className="font-mono text-sm max-w-[200px] truncate">
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