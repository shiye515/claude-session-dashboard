'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { History } from 'lucide-react'
import { useEffect, useState } from 'react'

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
    [key: string]: number | string
  }>
}

// Dynamic import for StatsCards and UsageChart
function StatsCards({ stats }: { stats: Stats['overview'] }) {
  const cards = [
    {
      title: '总请求数',
      value: stats.totalRequests.toLocaleString(),
      icon: '📊',
      description: 'API 调用次数'
    },
    {
      title: '成功率',
      value: `${stats.successRate}%`,
      icon: '✅',
      description: '请求成功比例'
    },
    {
      title: 'Token 使用',
      value: stats.totalTokens.toLocaleString(),
      icon: '⚡',
      description: `输入: ${stats.totalPromptTokens.toLocaleString()} | 输出: ${stats.totalCompletionTokens.toLocaleString()}`
    },
    {
      title: '平均响应时间',
      value: `${Math.round(stats.avgDurationMs)}ms`,
      icon: '⏱️',
      description: '请求平均耗时'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <span className="text-lg">{card.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [UsageChart, setUsageChart] = useState<React.ComponentType<{ data: Stats['daily'] }> | null>(null)

  useEffect(() => {
    import('@/components/dashboard/chart').then(mod => setUsageChart(() => mod.UsageChart))
  }, [])

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
            {stats.daily.length > 0 && UsageChart ? (
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
                      <Badge variant="outline">{p.provider}</Badge>
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
              <h4 className="font-semibold mb-1">通用代理</h4>
              <p className="text-muted-foreground mb-2">将原 API 地址作为 target 参数传入：</p>
              <code className="block bg-muted p-2 rounded break-all">
                http://localhost:3000/api/proxy?target=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-1">示例：OpenAI SDK</h4>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">
{`from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/api/proxy?target=https://api.openai.com/v1",
    api_key="your-api-key"
)`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold mb-1">示例：Anthropic SDK</h4>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">
{`from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:3000/api/proxy?target=https://api.anthropic.com",
    api_key="your-api-key"
)`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}