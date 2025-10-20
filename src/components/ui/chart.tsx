'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ChartProps {
  data: Array<{ label: string; value: number; color?: string }>
  type?: 'bar' | 'line' | 'pie' | 'donut'
  className?: string
  showValues?: boolean
  showLegend?: boolean
  height?: number
}

export function Chart({
  data,
  type = 'bar',
  className,
  showValues = true,
  showLegend = true,
  height = 200
}: ChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const total = data.reduce((sum, d) => sum + d.value, 0)

  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--muted))',
    'hsl(var(--destructive))',
    'hsl(var(--success))',
    'hsl(var(--warning))'
  ]

  if (type === 'bar') {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-end gap-2 h-48">
          {data.map((item, index) => (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col justify-end h-40">
                <div
                  className="w-full bg-primary rounded-t transition-all duration-500 ease-out"
                  style={{
                    height: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || colors[index % colors.length]
                  }}
                />
              </div>
              {showValues && (
                <span className="text-xs font-medium">{item.value}</span>
              )}
              <span className="text-xs text-muted-foreground text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        {showLegend && (
          <div className="flex flex-wrap gap-4 justify-center">
            {data.map((item, index) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: item.color || colors[index % colors.length]
                  }}
                />
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (type === 'pie' || type === 'donut') {
    let currentAngle = 0
    const radius = type === 'donut' ? 60 : 80
    const innerRadius = type === 'donut' ? 40 : 0

    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-center">
          <svg width={height} height={height} className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = item.value / total
              const angle = percentage * 360
              const startAngle = currentAngle
              const endAngle = currentAngle + angle

              const x1 = Math.cos((startAngle * Math.PI) / 180) * radius
              const y1 = Math.sin((startAngle * Math.PI) / 180) * radius
              const x2 = Math.cos((endAngle * Math.PI) / 180) * radius
              const y2 = Math.sin((endAngle * Math.PI) / 180) * radius

              const largeArcFlag = angle > 180 ? 1 : 0

              const pathData = [
                `M ${height / 2} ${height / 2}`,
                `L ${height / 2 + x1} ${height / 2 + y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${height / 2 + x2} ${height / 2 + y2}`,
                'Z'
              ].join(' ')

              const innerPathData = innerRadius > 0 ? [
                `M ${height / 2} ${height / 2}`,
                `L ${height / 2 + x1 * (innerRadius / radius)} ${height / 2 + y1 * (innerRadius / radius)}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${height / 2 + x2 * (innerRadius / radius)} ${height / 2 + y2 * (innerRadius / radius)}`,
                'Z'
              ].join(' ') : ''

              currentAngle += angle

              return (
                <g key={item.label}>
                  <path
                    d={pathData}
                    fill={item.color || colors[index % colors.length]}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                  {innerRadius > 0 && (
                    <path
                      d={innerPathData}
                      fill="hsl(var(--background))"
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        {showLegend && (
          <div className="flex flex-wrap gap-4 justify-center">
            {data.map((item, index) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: item.color || colors[index % colors.length]
                  }}
                />
                <span className="text-sm">{item.label}</span>
                <span className="text-sm text-muted-foreground">
                  ({Math.round((item.value / total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  className
}: MetricCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <div className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm p-6",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change !== undefined && (
            <p className={cn(
              "text-sm flex items-center gap-1",
              isPositive && "text-green-600",
              isNegative && "text-red-600"
            )}>
              {isPositive && "↗"}
              {isNegative && "↘"}
              {Math.abs(change)}%
              {changeLabel && (
                <span className="text-muted-foreground">vs {changeLabel}</span>
              )}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
