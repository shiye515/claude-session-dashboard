'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { UsageChart } from '@/components/dashboard/chart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { History } from 'lucide-react'

interface Stats {
  overview: {
    totalRequests: number
    successRate: string
    totalPromptTokens: number
    totalCompletionTokens: number
    totalTokens: number
    avgDurationMs: number
  }
  byProvider: Array<{
    provider: string
    count: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }>
  byModel: Array<{
    model: string
    count: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }>
  daily: Array<{
    date: string
    count: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
    openai: number
    anthropic: number
  }>
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">错误: {error}</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">暂无数据</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">大模型 API 代理监控面板</p>
        </div>
        <Link href="/logs">
          <Button variant="outline">
            <History className="h-4 w-4 mr-2" />
            历史记录
          </Button>
        </Link>
      </div>

      <StatsCards stats={stats.overview} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>请求趋势</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.daily.length > 0 ? (
              <UsageChart data={stats.daily} />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>按提供商统计</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byProvider.length > 0 ? (
              <div className="space-y-4">
                {stats.byProvider.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {p.provider === 'openai' ? 'OpenAI' : 'Anthropic'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {p.count} 次请求
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Token: </span>
                      {p.totalTokens.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>按模型统计</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.byModel.length > 0 ? (
            <div className="space-y-2">
              {stats.byModel.map((m) => (
                <div key={m.model} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <code className="text-sm">{m.model}</code>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({m.count} 次)
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    输入: {m.promptTokens.toLocaleString()} | 输出: {m.completionTokens.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[100px] text-muted-foreground">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用方式</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">OpenAI</h4>
              <code className="block bg-muted p-2 rounded">
                base_url = &quot;http://localhost:3000/api/proxy/openai/v1&quot;
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Anthropic</h4>
              <code className="block bg-muted p-2 rounded">
                base_url = &quot;http://localhost:3000/api/proxy/anthropic/v1&quot;
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}