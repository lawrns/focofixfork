'use client'

import { useState, useEffect } from 'react'

const tabs = [
  { id: 'table', name: 'Table' },
  { id: 'kanban', name: 'Kanban' },
  { id: 'gantt', name: 'Gantt' },
  { id: 'analytics', name: 'Analytics' },
  { id: 'goals', name: 'Goals' },
]

interface ViewTabsProps {
  activeTab?: string
  onTabChange?: (tabId: string) => void
}

export default function ViewTabs({ activeTab = 'table', onTabChange }: ViewTabsProps) {
  const [currentTab, setCurrentTab] = useState(activeTab)

  // Sync internal state with prop changes
  useEffect(() => {
    setCurrentTab(activeTab)
  }, [activeTab])

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId)
    onTabChange?.(tabId)
  }

  return (
    <div className="border-b border-border relative">
      {/* Scroll fade indicators for mobile */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 sm:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 sm:hidden" />

      <nav
        aria-label="Tabs"
        className="-mb-px flex gap-2 sm:gap-4 md:gap-8 overflow-x-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE/Edge */
        }}
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                border-b-2 px-3 sm:px-4 pb-3 pt-2
                text-xs sm:text-sm font-medium
                whitespace-nowrap flex-shrink-0
                min-h-[44px] flex items-center
                transition-all duration-200
                ${isActive
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }
              `}
            >
              {tab.name}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
