'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Log } from '@prisma/client'

interface LogDetailProps {
  log: Log | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogDetail({ log, open, onOpenChange }: LogDetailProps) {
  if (!log) return null

  const formatJson = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            请求详情
            <Badge variant="outline">
              {log.provider === 'openai' ? 'OpenAI' : 'Anthropic'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">ID:</span>
                <code className="ml-2">{log.id}</code>
              </div>
              <div>
                <span className="text-muted-foreground">时间:</span>
                <span className="ml-2">
                  {new Date(log.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">端点:</span>
                <code className="ml-2">{log.endpoint}</code>
              </div>
              <div>
                <span className="text-muted-foreground">模型:</span>
                <code className="ml-2">{log.model || '-'}</code>
              </div>
              <div>
                <span className="text-muted-foreground">状态码:</span>
                <Badge className="ml-2">{log.responseStatus}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">流式:</span>
                <Badge variant="outline" className="ml-2">
                  {log.isStreaming ? '是' : '否'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">输入Token:</span>
                <span className="ml-2">{log.promptTokens?.toLocaleString() || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">输出Token:</span>
                <span className="ml-2">{log.completionTokens?.toLocaleString() || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">总Token:</span>
                <span className="ml-2">{log.totalTokens?.toLocaleString() || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">耗时:</span>
                <span className="ml-2">{log.durationMs ? `${log.durationMs}ms` : '-'}</span>
              </div>
            </div>

            <Separator />

            {/* 请求头 */}
            <div>
              <h4 className="font-semibold mb-2">请求头</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                {formatJson(log.requestHeaders)}
              </pre>
            </div>

            {/* 请求体 */}
            <div>
              <h4 className="font-semibold mb-2">请求体</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px]">
                {formatJson(log.requestBody)}
              </pre>
            </div>

            {/* 响应体 */}
            <div>
              <h4 className="font-semibold mb-2">响应体</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[300px]">
                {formatJson(log.responseBody)}
              </pre>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}