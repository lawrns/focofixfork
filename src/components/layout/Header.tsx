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
  const displayUser = user || { email: 'test@example.com', user_metadata: { full_name: 'Test User' } }
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
      {/* TEMPORARY: Just render user avatar */}
      <div className="flex flex-1 justify-end items-center gap-2 md:gap-4">
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
