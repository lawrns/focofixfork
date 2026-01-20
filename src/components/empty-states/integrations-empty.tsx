'use client'

import { BaseEmptyState } from './base-empty-state'
import Image from 'next/image'
import { Zap, Github, MessageSquare, Calendar } from 'lucide-react'

interface IntegrationsEmptyProps {
  onBrowseIntegrations: () => void
}

export function IntegrationsEmpty({ onBrowseIntegrations }: IntegrationsEmptyProps) {
  const illustration = (
    <div className="relative w-full h-full">
      <Image
        src="/images/empty-states/integrations.png"
        alt="Connect integrations"
        width={192}
        height={192}
        className="mx-auto dark:opacity-90"
        priority
      />
    </div>
  )

  const popularIntegrations = [
    { name: 'Slack', icon: MessageSquare, description: 'Team communication' },
    { name: 'GitHub', icon: Github, description: 'Code repository' },
    { name: 'Calendar', icon: Calendar, description: 'Schedule sync' },
    { name: 'Zapier', icon: Zap, description: 'Automate workflows' }
  ]

  return (
    <BaseEmptyState
      title="No integrations connected"
      description="Connect your favorite tools to streamline your workflow and keep everything in sync."
      illustration={illustration}
      primaryAction={{
        label: 'Browse Integrations',
        onClick: onBrowseIntegrations,
        variant: 'default'
      }}
    >
      {/* Popular integrations */}
      <div className="mt-8 max-w-2xl mx-auto">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">Popular integrations</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {popularIntegrations.map(({ name, icon: Icon, description }) => (
            <button
              key={name}
              onClick={onBrowseIntegrations}
              className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
            >
              <Icon className="w-6 h-6 text-zinc-400 dark:text-zinc-500 group-hover:text-primary-500 mx-auto mb-2 transition-colors" />
              <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{name}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary-400 rounded-full" />
          Sync data automatically
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary-400 rounded-full" />
          Reduce manual work
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary-400 rounded-full" />
          Stay in the flow
        </div>
      </div>
    </BaseEmptyState>
  )
}
