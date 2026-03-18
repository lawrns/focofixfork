'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  AlertTriangle,
  FolderKanban,
  ArrowUpDown,
  ScanLine,
  GitPullRequest,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state-standard';
import { ProjectEmptyState } from '@/features/delegation/components/ProjectEmptyState';
import { buttons } from '@/lib/copy';
import { useAuth } from '@/lib/hooks/use-auth';
import { useMobile } from '@/lib/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ProjectCard } from './ProjectCard';
import { ProjectRow } from './ProjectRow';
import { EditProjectDialog, CreateProjectDialog } from './ProjectsDialogs';
import { useProjectHandlers } from './useProjectHandlers';
import { useProjectsFetch } from './useProjectsFetch';

export default function ProjectsPageClient({ pageTitle = 'Projects' }: { pageTitle?: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isMobile = useMobile();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editDelegationEnabled, setEditDelegationEnabled] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isLanIpHost, setIsLanIpHost] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);
  const [scanResult, setScanResult] = useState<{ synced: number; errors: number } | null>(null);

  const {
    projects,
    setProjects,
    isLoading,
    fetchFailed,
    fetchFailureReason,
    fetchFailureMessage,
    currentWorkspaceId,
  } = useProjectsFetch(user, authLoading);

  const {
    handleCreateProject,
    handleDuplicateProject,
    handleEditProject,
    handleSaveProject,
    handleGenerateStatus,
    handleToggleDelegation,
    handleArchiveProject,
  } = useProjectHandlers({
    currentWorkspaceId,
    user,
    setProjects,
    setEditingProject,
    setEditProjectName,
    setEditProjectDescription,
    setEditDelegationEnabled,
    setEditDialogOpen,
    editingProject,
    editProjectName,
    editProjectDescription,
    editDelegationEnabled,
    setIsSavingProject,
    newProjectName,
    newProjectDescription,
    setNewProjectName,
    setNewProjectDescription,
    setIsCreatingProject,
    setCreateDialogOpen,
  });

  // Handle query parameters from command palette
  useEffect(() => {
    const createParam = searchParams?.get('create');
    if (createParam === 'true') {
      setCreateDialogOpen(true);
      router.replace(pathname || '/empire/missions');
    }
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname;
    const ipv4Pattern = /^\d{1,3}(\.\d{1,3}){3}$/;
    setIsLanIpHost(ipv4Pattern.test(host));
  }, []);

  const scanWorkspace = async (silent = false) => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const res = await fetch('/api/projects/sync-git', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setScanResult({ synced: data.synced?.length ?? 0, errors: data.errors?.length ?? 0 });
        setLastScanAt(new Date());
        if (!silent) {
          // Soft-reload to pick up newly indexed projects
          router.refresh();
          if (data.synced?.length > 0) {
            toast.success(`Scanned workspace`, { description: `${data.synced.length} project(s) indexed` });
          }
        }
      }
    } catch {
      // silently ignore scan errors
    } finally {
      setIsScanning(false);
    }
  };

  const handleGitPull = async (project: any) => {
    try {
      const res = await fetch('/api/projects/git-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ project_id: project.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Pulled ${project.name}`, { description: data.stdout?.trim() || 'Already up to date.' });
        // Trigger a rescan to update the project description with latest branch
        void fetch('/api/projects/sync-git', { method: 'POST', credentials: 'include' });
      } else {
        toast.error(`Pull failed: ${project.name}`, { description: data.error || 'Unknown error' });
      }
    } catch (err) {
      toast.error(`Pull failed: ${project.name}`);
    }
  };

  // Auto-scan workspace on mount and every 2 minutes (silent — no toast/reload)
  useEffect(() => {
    if (!user || authLoading) return;
    scanWorkspace(true);
    const interval = setInterval(() => scanWorkspace(true), 2 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'progress': return b.progress - a.progress;
      case 'risk': {
        const riskOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return riskOrder[a.risk] - riskOrder[b.risk];
      }
      default: return 0;
    }
  });

  const sharedCardProps = {
    onEdit: handleEditProject,
    onDuplicate: handleDuplicateProject,
    onGenerateStatus: handleGenerateStatus,
    onArchive: handleArchiveProject,
    onToggleDelegation: handleToggleDelegation,
    onGitPull: handleGitPull,
  };

  if (isLoading) {
    return (
      <PageShell maxWidth="6xl">
        <PageHeader
          title={pageTitle}
          subtitle="Loading..."
          primaryAction={
            <Button disabled>
              <Plus className="h-4 w-4" />
              {buttons.createProject}
            </Button>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="6xl">
      <PageHeader
        title={pageTitle}
        subtitle={`${projects.length} active projects`}
        primaryAction={
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scanWorkspace(false)}
            disabled={isScanning}
            title={lastScanAt ? `Last scanned: ${lastScanAt.toLocaleTimeString()}` : 'Scan workspace for git repos'}
            className="gap-1.5"
          >
            <ScanLine className={`h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{isScanning ? 'Scanning…' : 'Scan'}</span>
          </Button>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px] flex-1 sm:flex-none">
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="risk">Risk level</SelectItem>
            </SelectContent>
          </Select>

          <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'list')} className="w-auto">
            <TabsList>
              <TabsTrigger value="grid"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Projects Grid / List */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {sortedProjects.map((project) => (
            <ProjectCard key={project.id} project={project} {...sharedCardProps} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="hidden sm:flex items-center gap-4 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <div className="w-9" />
            <div className="flex-1">Project</div>
            <div className="w-32">Progress</div>
            <div className="hidden md:block w-36">Fleet</div>
            <div className="w-32">Owner</div>
            <div className="w-24">Updated</div>
            <div className="w-20" />
          </div>
          {sortedProjects.map((project) => (
            <ProjectRow key={project.id} project={project} isMobile={isMobile} {...sharedCardProps} />
          ))}
        </div>
      )}

      {/* Empty / Error States */}
      {sortedProjects.length === 0 && !search && !fetchFailed && (
        <ProjectEmptyState hasProjects={false} />
      )}

      {fetchFailed && sortedProjects.length === 0 && (
        <EmptyState
          icon={AlertTriangle}
          title={
            fetchFailureReason === 'unauthenticated' ? 'Sign in required'
              : fetchFailureReason === 'forbidden' ? 'Access denied'
              : fetchFailureReason === 'network' ? 'Network problem'
              : 'Failed to load projects'
          }
          description={fetchFailureMessage ?? 'There was a problem loading your projects. Please try again.'}
          primaryAction={{
            label: fetchFailureReason === 'unauthenticated' ? 'Go to sign in' : 'Retry',
            onClick: () => {
              if (fetchFailureReason === 'unauthenticated') { router.push('/login'); return; }
              window.location.reload();
            },
          }}
          size="md"
        />
      )}

      {isLanIpHost && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          LAN/IP access detected. If projects fail to load after login, verify auth callback and allowed origins include this host.
        </div>
      )}

      {sortedProjects.length === 0 && search && (
        <EmptyState
          icon={FolderKanban}
          title={`No projects matching "${search}"`}
          description="Try a different search term"
          primaryAction={{ label: 'Clear search', onClick: () => setSearch('') }}
        />
      )}

      <EditProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editProjectName={editProjectName}
        editProjectDescription={editProjectDescription}
        editDelegationEnabled={editDelegationEnabled}
        isSavingProject={isSavingProject}
        onNameChange={setEditProjectName}
        onDescriptionChange={setEditProjectDescription}
        onDelegationChange={setEditDelegationEnabled}
        onSave={handleSaveProject}
      />

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        newProjectName={newProjectName}
        newProjectDescription={newProjectDescription}
        isCreatingProject={isCreatingProject}
        onNameChange={setNewProjectName}
        onDescriptionChange={setNewProjectDescription}
        onCreate={handleCreateProject}
      />
    </PageShell>
  );
}
