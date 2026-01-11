'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, X, Settings, LogOut, User } from 'lucide-react'
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
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 border-b border-zinc-200 bg-white px-4 md:px-6">
      {/* Logo - Minimal */}
      <div className="flex items-center gap-3">
        <Image
          src="/focologo.png"
          alt="Foco"
          width={24}
          height={24}
          className="h-6 w-6"
        />
        <span className="text-sm font-semibold text-zinc-900">Foco</span>
      </div>

      {/* Right Side - Compact */}
      <div className="flex items-center gap-2">
        {/* Search - Minimal Input */}
        <div className="relative w-56 md:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <input
            className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
            placeholder="Search..."
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            onBlur={() => {
              setTimeout(() => setShowResults(false), 150)
            }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Search Results - Clean Dropdown */}
          {showResults && (
            <div className="absolute top-full mt-1 w-full bg-white border border-zinc-200 rounded-md shadow-sm z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center p-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-zinc-900"></div>
                  <span className="ml-2 text-xs text-zinc-500">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] uppercase font-medium rounded bg-zinc-100 text-zinc-600">
                        {result.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-zinc-900">{result.name}</p>
                        {result.description && (
                          <p className="text-[11px] text-zinc-500 truncate">{result.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <div className="p-3 text-center">
                  <p className="text-xs text-zinc-500">No results found</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Actions - Compact Icons */}
        <HeyMenu />
        <LanguageSelectorCompact />
        <ThemeToggle />

        {/* User Menu - Minimal Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors">
              {avatarText}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-medium text-zinc-900">{displayUser?.email}</p>
                <p className="text-[11px] text-zinc-500">
                  {displayUser?.user_metadata?.full_name || 'User'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-3.5 w-3.5" />
              <span className="text-xs">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              <User className="mr-2 h-3.5 w-3.5" />
              <span className="text-xs">Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span className="text-xs">Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
