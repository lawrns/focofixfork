'use client'

import { Search, HelpCircle } from 'lucide-react'
import { SavedViews } from '@/components/ui/saved-views'
import { ViewConfig } from '@/lib/hooks/use-saved-views'

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold text-foreground">Foco</h2>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary">
            Project Management
          </span>
          <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
            Dashboard
          </span>
        </div>
      </div>

      {/* Saved Views */}
      <div className="hidden md:flex flex-1 justify-center px-8">
        <SavedViews
          onViewSelect={(view: ViewConfig) => {
            // TODO: Implement view selection logic
            console.log('Selected view:', view)
          }}
          onViewSave={(name: string) => {
            // TODO: Implement view saving logic
            console.log('Saving view:', name)
          }}
          currentViewConfig={{
            type: 'table',
            filters: {},
          }}
        />
      </div>

      <div className="flex flex-1 justify-end items-center gap-4">
        {/* Search */}
        <div className="relative w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Search projects..."
            type="search"
          />
        </div>
        
        {/* Help Button */}
        <button className="flex size-11 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <HelpCircle className="h-5 w-5" />
        </button>
        
        {/* User Avatar */}
        <div className="size-11 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-semibold text-primary">U</span>
        </div>
      </div>
    </header>
  )
}
