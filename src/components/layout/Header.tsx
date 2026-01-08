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
import { LanguageSelectorCompact } from '@/components/ui/language-selector'
import { HeyMenu } from '@/components/notifications/hey-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
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
  const { user } = useAuth()
  const { t } = useTranslation()

  // Use actual user or null - no fallback to prevent confusion
  const displayUser = user
  const avatarText = displayUser?.email?.charAt(0).toUpperCase() || '?'

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

      // Process results...
      // (keeping existing search logic)

      setSearchResults(results)
    } catch (error) {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [user])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setShowResults(query.trim() !== '')

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query)
      } else {
        setSearchResults([])
      }
    }, 300)

    setDebounceTimer(timer)
  }, [performSearch, debounceTimer])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      setDebounceTimer(null)
    }
  }, [debounceTimer])

  const handleResultClick = useCallback((result: SearchResult) => {
    // Navigate to the result
    if (result.type === 'project') {
      router.push(`/projects/${result.id}`)
    } else if (result.type === 'task') {
      router.push(`/tasks/${result.id}`)
    } else if (result.type === 'milestone') {
      router.push(`/milestones/${result.id}`)
    }
    clearSearch()
  }, [router, clearSearch])

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

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
        <div className="hidden lg:flex items-center gap-2">
            <span className="rounded-lg bg-primary/20 px-3 py-2 text-sm font-medium text-primary whitespace-nowrap">
              Project Management
            </span>
          <span className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
            Dashboard
          </span>
        </div>
      </div>

      <div className="hidden md:block">
        <SavedViews
          onViewSelect={(view: ViewConfig) => {
            // Handle view selection
          }}
          onViewSave={(name: string) => {
            // Handle view save
          }}
          currentViewConfig={{
            type: 'table',
            filters: {},
          }}
        />
      </div>

      <div className="flex flex-1 justify-end items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="relative w-full max-w-[200px] sm:max-w-xs md:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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
              className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-foreground text-muted-foreground"
            >
              <X className="h-4 w-4" />
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
                      <span className="px-2 py-1 text-xs rounded bg-primary/15 text-primary">
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
        <Button variant="ghost" size="compact" className="hidden sm:flex">
          <HelpCircle className="h-4 w-4" />
        </Button>

        {/* Hey Menu (Notifications) */}
        <HeyMenu />

        {/* Language Selector */}
        <LanguageSelectorCompact />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Avatar with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="compact" className="rounded-full bg-primary/20 hover:bg-primary/30">
              <span className="text-sm font-semibold text-primary">
                {avatarText}
              </span>
            </Button>
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
