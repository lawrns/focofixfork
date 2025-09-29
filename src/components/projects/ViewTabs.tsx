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
    <div className="border-b border-border">
      <nav aria-label="Tabs" className="-mb-px flex gap-8">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`border-b-2 px-2 pb-4 pt-1 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {tab.name}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
