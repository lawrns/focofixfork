'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, FolderKanban, CheckSquare, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';

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

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ tasks: [], projects: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  const fetchResults = useCallback(async () => {
    if (!debouncedQuery.trim() || !user) {
      setResults({ tasks: [], projects: [] });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
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
  }, [debouncedQuery, user]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

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
          rightIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          className="max-w-2xl"
        />
      </div>

      {/* Results */}
      {debouncedQuery && (
        <div className="mb-4">
          <p className="text-sm text-zinc-500">
            {isLoading ? 'Searching...' : `Found ${totalResults} result${totalResults !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!debouncedQuery && (
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

      {/* No Results */}
      {debouncedQuery && !isLoading && totalResults === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No results found
          </h3>
          <p className="text-sm text-zinc-500 max-w-md">
            Try adjusting your search query
          </p>
        </div>
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
