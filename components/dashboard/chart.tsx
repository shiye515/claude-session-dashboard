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
  openai: number
  anthropic: number
}

interface UsageChartProps {
  data: DailyStat[]
}

const chartConfig = {
  openai: {
    label: 'OpenAI',
    color: 'hsl(var(--chart-1))'
  },
  anthropic: {
    label: 'Anthropic',
    color: 'hsl(var(--chart-2))'
  }
} satisfies ChartConfig

export function UsageChart({ data }: UsageChartProps) {
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
        <Area
          type="monotone"
          dataKey="openai"
          stackId="1"
          stroke="var(--color-openai)"
          fill="var(--color-openai)"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="anthropic"
          stackId="1"
          stroke="var(--color-anthropic)"
          fill="var(--color-anthropic)"
          fillOpacity={0.6}
        />
      </AreaChart>
    </ChartContainer>
  )
}