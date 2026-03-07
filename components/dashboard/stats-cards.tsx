'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react'

interface StatsCardsProps {
  stats: {
    totalRequests: number
    successRate: string
    totalPromptTokens: number
    totalCompletionTokens: number
    totalTokens: number
    avgDurationMs: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: '总请求数',
      value: stats.totalRequests.toLocaleString(),
      icon: Activity,
      description: 'API 调用次数'
    },
    {
      title: '成功率',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      description: '请求成功比例'
    },
    {
      title: 'Token 使用',
      value: stats.totalTokens.toLocaleString(),
      icon: Zap,
      description: `输入: ${stats.totalPromptTokens.toLocaleString()} | 输出: ${stats.totalCompletionTokens.toLocaleString()}`
    },
    {
      title: '平均响应时间',
      value: `${Math.round(stats.avgDurationMs)}ms`,
      icon: Clock,
      description: '请求平均耗时'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
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