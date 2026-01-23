'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'

// Use untyped supabase client to avoid type instantiation depth issues
const untypedSupabase = supabase as any

export interface SearchResult {
  id: string
  type: 'project' | 'milestone' | 'user' | 'organization'
  title: string
  subtitle?: string
  description?: string
  url: string
  metadata?: Record<string, any>
  score: number
}

export interface SearchOptions {
  query: string
  types?: ('project' | 'milestone' | 'user' | 'organization')[]
  organizationId?: string
  projectId?: string
  limit?: number
  fuzzy?: boolean
}

export interface SearchState {
  results: SearchResult[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
}

const SEARCH_DEBOUNCE_MS = 300
const DEFAULT_LIMIT = 20

// Database row types for search queries
interface ProjectSearchRow {
  id: string
  name: string
  slug: string | null
  description: string | null
  organization_id: string | null
  workspaces: { name: string } | null
}

interface MilestoneSearchRow {
  id: string
  name: string
  description: string | null
  project_id: string | null
  status: string | null
  priority: string | null
  foco_projects: {
    name: string
    organization_id: string | null
    workspaces: { name: string } | null
  } | null
}

interface UserSearchRow {
  id: string
  email: string | null
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
}

interface OrganizationSearchRow {
  id: string
  name: string
  slug: string | null
  description: string | null
}

interface OrganizationMemberSearchRow {
  user_id: string
  role: string | null
  workspaces: {
    id: string
    name: string
  } | null
}

interface WorkspaceSearchRow {
  id: string
  name: string
  created_at: string | null
}

export function useSearch(options: SearchOptions) {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    hasMore: false
  })

  const [debouncedQuery, setDebouncedQuery] = useState(options.query)

  // Define search functions first (before performSearch)
  const searchProjects = useCallback(async (query: string, limit: number): Promise<SearchResult[]> => {
    const { data, error } = await untypedSupabase
      .from('foco_projects')
      .select(`
        id,
        name,
        slug,
        description,
        organization_id,
        workspaces (
          name
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit)

    if (error) throw error

    return (data || []).map((project: ProjectSearchRow) => ({
      id: project.id,
      type: 'project' as const,
      title: project.name,
      subtitle: project.workspaces?.name,
      description: project.description || undefined,
      url: `/projects/${project.slug || project.id}`,
      metadata: {
        organizationId: project.organization_id
      },
      score: calculateRelevanceScore(query, project.name, project.description || undefined)
    }))
  }, [])

  const searchMilestones = useCallback(async (query: string, limit: number): Promise<SearchResult[]> => {
    let queryBuilder = untypedSupabase
      .from('milestones')
      .select(`
        id,
        name,
        description,
        project_id,
        status,
        priority,
        foco_projects (
          name,
          organization_id,
          workspaces (
            name
          )
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit)

    if (options.projectId) {
      queryBuilder = queryBuilder.eq('project_id', options.projectId)
    }

    const { data, error } = await queryBuilder

    if (error) throw error

    return (data || []).map((milestone: MilestoneSearchRow) => ({
      id: milestone.id,
      type: 'milestone' as const,
      title: milestone.name,
      subtitle: milestone.foco_projects?.name,
      description: milestone.description || undefined,
      url: `/milestones/${milestone.id}`,
      metadata: {
        status: milestone.status,
        priority: milestone.priority,
        projectId: milestone.project_id,
        organizationName: milestone.foco_projects?.workspaces?.name
      },
      score: calculateRelevanceScore(query, milestone.name, milestone.description || undefined)
    }))
  }, [options.projectId])

  const searchUsers = useCallback(async (query: string, limit: number): Promise<SearchResult[]> => {
    const { data, error } = await untypedSupabase
      .from('organization_members')
      .select(`
        user_id,
        role,
        workspaces (
          id,
          name
        )
      `)
      .limit(limit)

    if (error) throw error

    const userResults: SearchResult[] = []

    ;(data || []).forEach((member: OrganizationMemberSearchRow) => {
      if (member.user_id.includes(query) || query.length < 3) {
        userResults.push({
          id: member.user_id,
          type: 'user' as const,
          title: `User ${member.user_id.slice(-8)}`,
          subtitle: member.workspaces?.name,
          description: `Role: ${member.role}`,
          url: `/users/${member.user_id}`,
          metadata: {
            role: member.role,
            organizationId: member.workspaces?.id
          },
          score: 0.5
        })
      }
    })

    return userResults.slice(0, limit)
  }, [])

  const searchOrganizations = useCallback(async (query: string, limit: number): Promise<SearchResult[]> => {
    const { data, error } = await untypedSupabase
      .from('workspaces')
      .select('id, name, created_at')
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (error) throw error

    return (data || []).map((org: WorkspaceSearchRow) => ({
      id: org.id,
      type: 'organization' as const,
      title: org.name,
      subtitle: 'Workspace',
      description: `Created ${org.created_at ? new Date(org.created_at).toLocaleDateString() : 'Unknown'}`,
      url: `/organizations/${org.id}`,
      metadata: {
        createdAt: org.created_at
      },
      score: calculateRelevanceScore(query, org.name)
    }))
  }, [])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(options.query)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [options.query])

  const performSearch = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const results: SearchResult[] = []
      const searchTerm = debouncedQuery.trim()
      const limit = options.limit || DEFAULT_LIMIT
      const types = options.types || ['project', 'milestone', 'user']

      // Search projects
      if (types.includes('project')) {
        const projectResults = await searchProjects(searchTerm, limit)
        results.push(...projectResults)
      }

      // Search milestones
      if (types.includes('milestone')) {
        const milestoneResults = await searchMilestones(searchTerm, limit)
        results.push(...milestoneResults)
      }

      // Search users
      if (types.includes('user')) {
        const userResults = await searchUsers(searchTerm, limit)
        results.push(...userResults)
      }

      // Search organizations
      if (types.includes('organization')) {
        const orgResults = await searchOrganizations(searchTerm, limit)
        results.push(...orgResults)
      }

      // Sort by relevance score
      results.sort((a, b) => b.score - a.score)

      // Limit total results
      const limitedResults = results.slice(0, limit)

      setState({
        results: limitedResults,
        isLoading: false,
        error: null,
        hasMore: results.length > limit
      })
    } catch (error) {
      console.error('Search error:', error)
      setState({
        results: [],
        isLoading: false,
        error: 'Search failed. Please try again.',
        hasMore: false
      })
    }
  }, [debouncedQuery, searchProjects, searchMilestones, searchUsers, searchOrganizations, options.limit, options.types])

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setState({
        results: [],
        isLoading: false,
        error: null,
        hasMore: false
      })
      return
    }

    performSearch()
  }, [debouncedQuery, performSearch])

  return {
    ...state,
    search: (newQuery: string) => {
      setDebouncedQuery(newQuery)
    },
    clear: () => {
      setState({
        results: [],
        isLoading: false,
        error: null,
        hasMore: false
      })
    }
  }
}

// Calculate relevance score based on string matching
function calculateRelevanceScore(query: string, title: string, description?: string): number {
  const queryLower = query.toLowerCase()
  const titleLower = title.toLowerCase()
  const descLower = description?.toLowerCase() || ''

  let score = 0

  // Exact title match gets highest score
  if (titleLower === queryLower) {
    score += 1.0
  }
  // Title starts with query
  else if (titleLower.startsWith(queryLower)) {
    score += 0.8
  }
  // Title contains query
  else if (titleLower.includes(queryLower)) {
    score += 0.6
  }

  // Description contains query
  if (descLower.includes(queryLower)) {
    score += 0.3
  }

  // Word-level matching
  const queryWords = queryLower.split(/\s+/)
  const titleWords = titleLower.split(/\s+/)

  queryWords.forEach(queryWord => {
    titleWords.forEach(titleWord => {
      if (titleWord === queryWord) {
        score += 0.2
      } else if (titleWord.startsWith(queryWord)) {
        score += 0.1
      }
    })
  })

  return Math.min(score, 1.0) // Cap at 1.0
}

// Hook for global search with keyboard shortcuts
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const search = useSearch({ query, limit: 10 })

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    searchResults: search.results,
    isLoading: search.isLoading,
    error: search.error,
    clearSearch: () => {
      setQuery('')
      search.clear()
    }
  }
}

// Hook for scoped search (within a project or organization)
export function useScopedSearch(scope: { projectId?: string; organizationId?: string }) {
  const [query, setQuery] = useState('')
  const search = useSearch({
    query,
    projectId: scope.projectId,
    organizationId: scope.organizationId,
    limit: 5
  })

  return {
    query,
    setQuery,
    results: search.results,
    isLoading: search.isLoading,
    clear: search.clear
  }
}
