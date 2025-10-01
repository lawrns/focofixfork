'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, HelpCircle, X } from 'lucide-react'
import { SavedViews } from '@/components/ui/saved-views'
import { ViewConfig } from '@/lib/hooks/use-saved-views'
import { useAuth } from '@/lib/hooks/use-auth'

interface SearchResult {
  id: string
  name: string
  type: 'project' | 'task' | 'milestone'
  description?: string
}

export default function Header() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const performSearch = async (query: string) => {
    if (!user || !query.trim()) return

    setIsSearching(true)
    try {
      const results: SearchResult[] = []

      // Search projects
      const projectsRes = await fetch(`/api/projects`, {
        headers: { 'x-user-id': user.id },
      })
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        const projects = (projectsData.data || []).filter((p: any) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
        )
        results.push(...projects.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.name,
          type: 'project' as const,
          description: p.description
        })))
      }

      // Search tasks
      const tasksRes = await fetch(`/api/tasks`, {
        headers: { 'x-user-id': user.id },
      })
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        const tasks = (tasksData.data || []).filter((t: any) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          (t.description && t.description.toLowerCase().includes(query.toLowerCase()))
        )
        results.push(...tasks.slice(0, 5).map((t: any) => ({
          id: t.id,
          name: t.title,
          type: 'task' as const,
          description: t.description
        })))
      }

      // Search milestones
      const milestonesRes = await fetch(`/api/milestones`, {
        headers: { 'x-user-id': user.id },
      })
      if (milestonesRes.ok) {
        const milestonesData = await milestonesRes.json()
        const milestones = (milestonesData.data || []).filter((m: any) =>
          m.title.toLowerCase().includes(query.toLowerCase()) ||
          (m.description && m.description.toLowerCase().includes(query.toLowerCase()))
        )
        results.push(...milestones.slice(0, 5).map((m: any) => ({
          id: m.id,
          name: m.title,
          type: 'milestone' as const,
          description: m.description
        })))
      }

      setSearchResults(results.slice(0, 10))
      setShowResults(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('')
    setShowResults(false)
    switch (result.type) {
      case 'project':
        router.push(`/projects/${result.id}`)
        break
      case 'task':
        router.push(`/tasks`)
        break
      case 'milestone':
        router.push(`/milestones/${result.id}`)
        break
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

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
            console.log('Selected view:', view)
          }}
          onViewSave={(name: string) => {
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
            className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Search projects, tasks, milestones..."
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowResults(true)}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-foreground text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      result.type === 'project' ? 'bg-blue-100 text-blue-800' :
                      result.type === 'task' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {result.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.name}</p>
                      {result.description && (
                        <p className="text-sm text-muted-foreground truncate">{result.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg p-4 z-50">
              <p className="text-sm text-muted-foreground text-center">No results found</p>
            </div>
          )}
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
