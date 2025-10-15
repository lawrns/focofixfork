'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, HelpCircle, X, Settings, LogOut, User } from 'lucide-react'
import { SavedViews } from '@/components/ui/saved-views'
import { ViewConfig } from '@/lib/hooks/use-saved-views'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTranslation } from '@/lib/i18n/context'
import { apiGet } from '@/lib/api-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase-client'

interface SearchResult {
  id: string
  name: string
  type: 'project' | 'task' | 'milestone'
  description?: string
}

export default function Header() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { t } = useTranslation()

  // Debug: Force render user avatar even if user is null
  const displayUser = user || { email: 'test@example.com' }
  const avatarText = displayUser?.email?.charAt(0).toUpperCase() || 'U'

  console.log('Header component rendering:', { user: !!user, loading, displayUser: displayUser?.email })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const performSearch = useCallback(async (query: string) => {
    if (!user || !query.trim()) return

    setIsSearching(true)
    try {
      const results: SearchResult[] = []

      // Search with enhanced API client (parallel requests with timeout)
      const [projectsResult, tasksResult, milestonesResult] = await Promise.allSettled([
        apiGet('/api/projects?limit=10', { timeout: 5000 }),
        apiGet('/api/tasks?limit=10', { timeout: 5000 }),
        apiGet('/api/milestones?limit=10', { timeout: 5000 })
      ])

      // Process projects
      if (projectsResult.status === 'fulfilled' && projectsResult.value.ok) {
        const projects = (projectsResult.value.data?.data || []).filter((p: any) =>
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

      // Process tasks
      if (tasksResult.status === 'fulfilled' && tasksResult.value.ok) {
        const tasks = (tasksResult.value.data?.data || []).filter((t: any) =>
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

      // Process milestones
      if (milestonesResult.status === 'fulfilled' && milestonesResult.value.ok) {
        const milestones = (milestonesResult.value.data?.data || []).filter((m: any) =>
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
  }, [user])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Clear results immediately if query is empty
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      setIsSearching(false)
      return
    }

    // Show loading state immediately
    setIsSearching(true)
    setShowResults(true)

    // Debounce the search
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300) // 300ms debounce

    setDebounceTimer(timer)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    setIsSearching(false)
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      setDebounceTimer(null)
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-3 md:px-6 py-3 md:py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 md:gap-6">
        <div className="flex items-center gap-2 md:gap-3">
          <Image
            src="/focologo.png"
            alt="Foco Logo"
            width={32}
            height={32}
            className="h-6 md:h-8 w-auto"
          />
          <h2 className="text-lg md:text-xl font-bold text-foreground">Foco</h2>
        </div>
        <div className="hidden sm:flex items-center gap-3">
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

      <div className="flex flex-1 justify-end items-center gap-2 md:gap-4">
        {/* Search */}
        <div className="relative w-full max-w-[200px] sm:max-w-xs md:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 md:h-5 w-4 md:w-5 text-muted-foreground" />
          </div>
          <input
            className="h-9 md:h-11 w-full rounded-lg border border-input bg-background pl-8 md:pl-10 pr-8 md:pr-10 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder={t('common.search')}
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            onBlur={() => {
              // Delay hiding to allow click events on results
              setTimeout(() => setShowResults(false), 150)
            }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-2 md:pr-3 hover:text-foreground text-muted-foreground"
            >
              <X className="h-3 md:h-4 w-3 md:w-4" />
            </button>
          )}

          {/* Search Results Dropdown - Always present to prevent layout shifts */}
          {showResults && (
            <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50 min-h-[60px] max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        result.type === 'project' ? 'bg-blue-500 text-white' :
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
                ))
              ) : searchQuery.trim() ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('common.noResults')}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Help Button */}
        <button className="hidden sm:flex size-9 md:size-11 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <HelpCircle className="h-4 md:h-5 w-4 md:w-5" />
        </button>

        {/* User Avatar with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="size-9 md:size-11 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors cursor-pointer">
              <span className="text-xs md:text-sm font-semibold text-primary">
                {avatarText}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayUser?.email}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {displayUser?.user_metadata?.full_name || 'User'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t('navigation.settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>{t('navigation.profile')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('navigation.signOut')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
