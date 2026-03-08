'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Newspaper, Loader2 } from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/hooks/use-auth';
import type { ContentSource, ContentItem } from '@/features/content-pipeline/types';
import { ContentSourceManager } from '@/features/content-pipeline/components/content-source-manager';
import { ContentFeed } from '@/features/content-pipeline/components/content-feed';

interface Project {
  id: string;
  name: string;
}

export const dynamic = 'force-dynamic';

function ContentPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams?.get('project_id') ?? null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects?limit=100');
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        setProjects(data.data || []);
        
        // Select first project if none selected
        if (!selectedProjectId && data.data?.length > 0) {
          setSelectedProjectId(data.data[0].id);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    if (user) {
      fetchProjects();
    }
  }, [user, selectedProjectId]);

  // Fetch sources when project changes
  const fetchSources = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoadingSources(true);
    try {
      const res = await fetch(`/api/content-pipeline/sources?project_id=${selectedProjectId}`);
      if (!res.ok) throw new Error('Failed to fetch sources');
      const data = await res.json();
      setSources(data.data || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setIsLoadingSources(false);
    }
  }, [selectedProjectId]);

  // Fetch items when project changes
  const fetchItems = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoadingItems(true);
    try {
      const res = await fetch(`/api/content-pipeline/items?project_id=${selectedProjectId}&limit=100`);
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(data.data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchSources();
      fetchItems();
    }
  }, [selectedProjectId, fetchSources, fetchItems]);

  const handleRefresh = useCallback(() => {
    fetchSources();
    fetchItems();
  }, [fetchSources, fetchItems]);

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Content Pipeline"
        subtitle="Monitor RSS feeds and APIs, analyze with AI, surface processed intelligence"
      />

      {/* Project Selector */}
      <div className="mb-6">
        <Label className="text-sm mb-2 block">Project</Label>
        {isLoadingProjects ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects available</p>
        ) : (
          <Select 
            value={selectedProjectId || ''} 
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedProjectId ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
          {/* Left: Source Manager */}
          <div className="lg:col-span-2">
            <ContentSourceManager
              projectId={selectedProjectId}
              sources={sources}
              isLoading={isLoadingSources}
              onSourcesChange={handleRefresh}
            />
          </div>

          {/* Right: Content Feed */}
          <div className="lg:col-span-3">
            <ContentFeed
              items={items}
              isLoading={isLoadingItems}
              onItemsChange={handleRefresh}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Newspaper className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Select a project to get started</p>
          <p className="text-sm mt-1">Choose a project to manage content sources and view feeds</p>
        </div>
      )}
    </PageShell>
  );
}

export default function ContentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <ContentPageContent />
    </Suspense>
  );
}
