'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart'

interface DailyStat {
  date: string
  count: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  [key: string]: number | string
}

interface UsageChartProps {
  data: DailyStat[]
}

// Dynamic colors for different providers
const PROVIDER_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export function UsageChart({ data }: UsageChartProps) {
  // Get unique providers from data
  const providers = new Set<string>()
  data.forEach(stat => {
    Object.keys(stat).forEach(key => {
      if (key !== 'date' && key !== 'count' && key !== 'promptTokens' && key !== 'completionTokens' && key !== 'totalTokens') {
        providers.add(key)
      }
    })
  })

  const chartConfig = {
    ...Array.from(providers).reduce((acc, provider, index) => {
      acc[provider] = {
        label: provider,
        color: PROVIDER_COLORS[index % PROVIDER_COLORS.length]
      }
      return acc
    }, {} as ChartConfig)
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => value.slice(5)}
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {Array.from(providers).map((provider, index) => (
          <Area
            key={provider}
            type="monotone"
            dataKey={provider}
            stackId="1"
            stroke={PROVIDER_COLORS[index % PROVIDER_COLORS.length]}
            fill={PROVIDER_COLORS[index % PROVIDER_COLORS.length]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}