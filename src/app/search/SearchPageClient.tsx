'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Search, FolderKanban, CheckSquare, X } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { InlineLoadingSkeleton } from '@/components/skeleton-screens';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/use-auth';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { SearchEmpty } from '@/components/empty-states/search-empty';

interface SearchResult {
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    project?: { name: string; slug: string };
  }>;
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    status?: string;
  }>;
}

interface SearchFilters {
  scope: 'all' | 'task' | 'project' | 'people' | 'file';
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

type DateRange = 'any' | 'week' | 'month' | 'custom';

export default function SearchPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ tasks: [], projects: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    scope: (searchParams.get('scope') as any) || 'all',
    projectId: searchParams.get('project_id') || undefined,
    dateFrom: searchParams.get('date_from') || undefined,
    dateTo: searchParams.get('date_to') || undefined,
    status: searchParams.get('status') || undefined,
  });
  const [dateRange, setDateRange] = useState<DateRange>('any');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.scope !== 'all' ||
           filters.projectId ||
           filters.dateFrom ||
           filters.status;
  }, [filters]);

  // Fetch search results with filters
  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) {
      setResults({ tasks: [], projects: [] });
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('q', searchQuery);

      if (filters.scope !== 'all') {
        params.set('type', filters.scope);
      }
      if (filters.projectId) {
        params.set('project_id', filters.projectId);
      }
      if (filters.dateFrom) {
        params.set('date_from', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set('date_to', filters.dateTo);
      }
      if (filters.status) {
        params.set('status', filters.status);
      }

      const response = await fetch(
        `/api/search?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResults(data.data || { tasks: [], projects: [] });
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ tasks: [], projects: [] });
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  // Debounce search query with 300ms delay (search fields)
  useDebounce(query, fetchResults, 300);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.scope !== 'all') {
      params.set('scope', filters.scope);
    }
    if (filters.projectId) {
      params.set('project_id', filters.projectId);
    }
    if (filters.dateFrom) {
      params.set('date_from', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.set('date_to', filters.dateTo);
    }
    if (filters.status) {
      params.set('status', filters.status);
    }

    if (params.toString()) {
      router.push(`/search?${params.toString()}`);
    } else {
      router.push('/search');
    }
  }, [filters, router]);

  // Handle scope change
  const handleScopeChange = (newScope: SearchFilters['scope']) => {
    setFilters(prev => ({ ...prev, scope: newScope }));
  };

  // Handle project filter change
  const handleProjectChange = (projectId: string) => {
    setFilters(prev => ({
      ...prev,
      projectId: projectId ? projectId : undefined,
    }));
  };

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    const now = new Date();

    switch (range) {
      case 'any':
        setFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined }));
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setFilters(prev => ({
          ...prev,
          dateFrom: weekAgo.toISOString().split('T')[0],
          dateTo: now.toISOString().split('T')[0],
        }));
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setFilters(prev => ({
          ...prev,
          dateFrom: monthAgo.toISOString().split('T')[0],
          dateTo: now.toISOString().split('T')[0],
        }));
        break;
      case 'custom':
        // Keep custom dates as they are
        break;
    }
  };

  // Handle custom date change
  const handleCustomDateChange = (type: 'from' | 'to', date: string) => {
    if (type === 'from') {
      setCustomDateFrom(date);
      setFilters(prev => ({ ...prev, dateFrom: date }));
    } else {
      setCustomDateTo(date);
      setFilters(prev => ({ ...prev, dateTo: date }));
    }
  };

  // Handle status change
  const handleStatusChange = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status ? status : undefined,
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      scope: 'all',
      projectId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
    });
    setDateRange('any');
    setCustomDateFrom('');
    setCustomDateTo('');
  };

  const totalResults = results.tasks.length + results.projects.length;

  return (
    <PageShell>
      <PageHeader
        title="Search"
        subtitle="Search for tasks and projects"
      />

      {/* Search Input */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search tasks and projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          rightIcon={isLoading ? <InlineLoadingSkeleton size="sm" /> : undefined}
          className="max-w-2xl"
        />
      </div>

      {/* Scope Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['all', 'task', 'project', 'people', 'file'].map((scope) => (
          <button
            key={scope}
            onClick={() => handleScopeChange(scope as any)}
            aria-pressed={filters.scope === scope}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full transition-colors',
              filters.scope === scope
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            )}
            type="button"
          >
            {scope.charAt(0).toUpperCase() + scope.slice(1)}
          </button>
        ))}
      </div>

      {/* Additional Filters */}
      <div className="mb-6 flex gap-3 flex-wrap items-center">
        {/* Date Filter */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.currentTarget.nextElementSibling?.classList.toggle('hidden');
            }}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            aria-label="Filter by date"
            type="button"
          >
            📅 Date
          </button>
          <div className="hidden absolute top-full left-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3 z-10 min-w-max">
            <div className="space-y-2">
              <button
                onClick={(ev) => {
                  handleDateRangeChange('any');
                  (ev.currentTarget as HTMLButtonElement).parentElement?.parentElement?.classList.add('hidden');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-sm"
                type="button"
              >
                Any time
              </button>
              <button
                onClick={(ev) => {
                  handleDateRangeChange('week');
                  (ev.currentTarget as HTMLButtonElement).parentElement?.parentElement?.classList.add('hidden');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-sm"
                type="button"
              >
                Past week
              </button>
              <button
                onClick={(ev) => {
                  handleDateRangeChange('month');
                  (ev.currentTarget as HTMLButtonElement).parentElement?.parentElement?.classList.add('hidden');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-sm"
                type="button"
              >
                Past month
              </button>
              <button
                onClick={(ev) => {
                  handleDateRangeChange('custom');
                  (ev.currentTarget as HTMLButtonElement).parentElement?.parentElement?.classList.add('hidden');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-sm"
                type="button"
              >
                Custom
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.currentTarget.nextElementSibling?.classList.toggle('hidden');
            }}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            aria-label="Filter by status"
            type="button"
          >
            📋 Status
          </button>
          <div className="hidden absolute top-full left-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3 z-10 min-w-max">
            <div className="space-y-2">
              <button
                onClick={(ev) => {
                  handleStatusChange('');
                  (ev.currentTarget as HTMLButtonElement).parentElement?.parentElement?.classList.add('hidden');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-sm"
                type="button"
              >
                All statuses
              </button>
              <button
                onClick={(ev) => {
                  handleStatusChange('active');
                  (ev.currentTarget as HTMLButtonElement).parentElement?.parentElement?.classList.add('hidden');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-sm"
                type="button"
              >
                Active
              </button>
              <button
                onClick={(ev) => {
                  handleStatusChange('completed');
                  (ev.currentTarget as HTMLButtonElement).parentElement?.parentElement?.classList.add('hidden');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-sm"
                type="button"
              >
                Completed
              </button>
              <button
                onClick={(ev) => {
                  handleStatusChange('archived');
                  (ev.currentTarget as HTMLButtonElement).parentElement?.parentElement?.classList.add('hidden');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-sm"
                type="button"
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        {/* Project Filter */}
        <div className="relative">
          <select
            value={filters.projectId || ''}
            onChange={(e) => handleProjectChange(e.target.value)}
            aria-label="Filter by project"
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:bg-zinc-800"
          >
            <option value="">All Projects</option>
            <option value="p1">Project 1</option>
            <option value="p2">Project 2</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900 flex items-center gap-1"
            aria-label="Clear all filters"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="mb-6 flex gap-2 flex-wrap">
          {filters.scope !== 'all' && (
            <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm flex items-center gap-2">
              <span>{filters.scope}</span>
              <button
                onClick={() => handleScopeChange('all')}
                className="hover:text-red-500"
                aria-label="Remove scope filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {filters.dateFrom && (
            <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm flex items-center gap-2">
              <span>Date: {filters.dateFrom}</span>
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined }));
                  setDateRange('any');
                }}
                className="hover:text-red-500"
                aria-label="Remove date filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {filters.status && (
            <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm flex items-center gap-2">
              <span>{filters.status}</span>
              <button
                onClick={() => handleStatusChange('')}
                className="hover:text-red-500"
                aria-label="Remove status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {query && (
        <div className="mb-4">
          <p className="text-sm text-zinc-500">
            {isLoading ? 'Searching...' : `Found ${totalResults} result${totalResults !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!query && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Search for tasks and projects
          </h3>
          <p className="text-sm text-zinc-500 max-w-md">
            Start typing to search across your tasks and projects
          </p>
        </div>
      )}

      {/* No Query or No Results */}
      {!query && !isLoading && (
        <SearchEmpty
          variant="no-query"
          onNewSearch={() => {
            // Focus on search input
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            searchInput?.focus();
          }}
        />
      )}
      {query && !isLoading && totalResults === 0 && (
        <SearchEmpty
          variant="no-results"
          query={query}
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
          onNewSearch={() => setQuery('')}
        />
      )}

      {/* Projects Results */}
      {results.projects.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Projects ({results.projects.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`}>
                <Card variant="interactive" padding="md">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    {project.status && (
                      <Badge variant="outline" className="w-fit">
                        {project.status}
                      </Badge>
                    )}
                  </CardHeader>
                  {project.description && (
                    <CardContent className="p-0 pt-2">
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Results */}
      {results.tasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks ({results.tasks.length})
          </h3>
          <div className="space-y-2">
            {results.tasks.map((task) => (
              <Link
                key={task.id}
                href={task.project?.slug ? `/projects/${task.project.slug}?task=${task.id}` : `/tasks/${task.id}`}
              >
                <Card variant="interactive" padding="sm">
                  <div className="flex items-start gap-3">
                    <CheckSquare className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      task.status === 'completed' ? "text-green-500" : "text-zinc-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-zinc-500 line-clamp-1 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.project && (
                          <Badge variant="outline" className="text-xs">
                            {task.project.name}
                          </Badge>
                        )}
                        {task.priority && (
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                        )}
                        {task.status && (
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
