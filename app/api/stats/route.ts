import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter = {
      createdAt: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {})
      }
    }

    // Get total stats
    const totalStats = await prisma.log.aggregate({
      where: dateFilter,
      _count: { id: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        durationMs: true
      },
      _avg: {
        durationMs: true
      }
    })

    // Get stats by provider
    const providerStats = await prisma.log.groupBy({
      by: ['provider'],
      where: dateFilter,
      _count: { id: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true
      }
    })

    // Get stats by model
    const modelStats = await prisma.log.groupBy({
      by: ['model'],
      where: {
        ...dateFilter,
        model: { not: null }
      },
      _count: { id: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true
      }
    })

    // Get success rate
    const statusStats = await prisma.log.groupBy({
      by: ['responseStatus'],
      where: dateFilter,
      _count: { id: true }
    })

    interface StatusStatItem {
      responseStatus: number
      _count: { id: number }
    }

    const successCount = statusStats
      .filter((s: StatusStatItem) => s.responseStatus >= 200 && s.responseStatus < 300)
      .reduce((acc: number, s: StatusStatItem) => acc + s._count.id, 0)

    const errorCount = totalStats._count.id - successCount

    // Get daily stats for chart
    const logs = await prisma.log.findMany({
      where: dateFilter,
      select: {
        createdAt: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        provider: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Group by day
    interface DailyStat {
      date: string
      count: number
      promptTokens: number
      completionTokens: number
      totalTokens: number
      openai: number
      anthropic: number
    }

    type DailyStats = Record<string, DailyStat>

    interface LogItem {
      createdAt: Date
      promptTokens: number | null
      completionTokens: number | null
      totalTokens: number | null
      provider: string
    }

    const dailyStats = logs.reduce((acc: DailyStats, log: LogItem) => {
      const date = log.createdAt.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          openai: 0,
          anthropic: 0
        }
      }
      acc[date].count++
      acc[date].promptTokens += log.promptTokens || 0
      acc[date].completionTokens += log.completionTokens || 0
      acc[date].totalTokens += log.totalTokens || 0
      if (log.provider === 'openai') acc[date].openai++
      if (log.provider === 'anthropic') acc[date].anthropic++
      return acc
    }, {} as DailyStats)

    interface ProviderStatItem {
      provider: string
      _count: { id: number }
      _sum: {
        promptTokens: number | null
        completionTokens: number | null
        totalTokens: number | null
      }
    }

    interface ModelStatItem {
      model: string | null
      _count: { id: number }
      _sum: {
        promptTokens: number | null
        completionTokens: number | null
        totalTokens: number | null
      }
    }

    return NextResponse.json({
      overview: {
        totalRequests: totalStats._count.id,
        successCount,
        errorCount,
        successRate: totalStats._count.id > 0
          ? ((successCount / totalStats._count.id) * 100).toFixed(2)
          : '0',
        totalPromptTokens: totalStats._sum.promptTokens || 0,
        totalCompletionTokens: totalStats._sum.completionTokens || 0,
        totalTokens: totalStats._sum.totalTokens || 0,
        avgDurationMs: totalStats._avg.durationMs || 0
      },
      byProvider: providerStats.map((p: ProviderStatItem) => ({
        provider: p.provider,
        count: p._count.id,
        promptTokens: p._sum.promptTokens || 0,
        completionTokens: p._sum.completionTokens || 0,
        totalTokens: p._sum.totalTokens || 0
      })),
      byModel: modelStats.map((m: ModelStatItem) => ({
        model: m.model,
        count: m._count.id,
        promptTokens: m._sum.promptTokens || 0,
        completionTokens: m._sum.completionTokens || 0,
        totalTokens: m._sum.totalTokens || 0
      })),
      daily: (Object.values(dailyStats) as DailyStat[]).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      byStatus: statusStats.map((s: StatusStatItem) => ({
        status: s.responseStatus,
        count: s._count.id
      }))
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}