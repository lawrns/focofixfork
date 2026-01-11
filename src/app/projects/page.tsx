'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreHorizontal,
  Star,
  StarOff,
  Users,
  Calendar,
  AlertTriangle,
  FolderKanban,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  isPinned: boolean;
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
  risk: 'none' | 'low' | 'medium' | 'high';
  nextMilestone?: { name: string; dueDate: string };
  owner: { name: string; avatar?: string };
  teamSize: number;
  updatedAt: string;
}

const mockProjects: ProjectData[] = [
  {
    id: '1',
    name: 'Website Redesign',
    slug: 'website-redesign',
    description: 'Complete overhaul of the company website with modern design',
    color: '#6366F1',
    icon: 'globe',
    status: 'active',
    isPinned: true,
    progress: 45,
    tasksCompleted: 12,
    totalTasks: 26,
    risk: 'none',
    nextMilestone: { name: 'Design Phase Complete', dueDate: '2026-01-20' },
    owner: { name: 'Sarah Chen' },
    teamSize: 5,
    updatedAt: '2 hours ago',
  },
  {
    id: '2',
    name: 'Mobile App v2',
    slug: 'mobile-app-v2',
    description: 'Major version upgrade with offline support and push notifications',
    color: '#10B981',
    icon: 'smartphone',
    status: 'active',
    isPinned: true,
    progress: 68,
    tasksCompleted: 22,
    totalTasks: 32,
    risk: 'high',
    nextMilestone: { name: 'Beta Release', dueDate: '2026-02-01' },
    owner: { name: 'Mike Johnson' },
    teamSize: 4,
    updatedAt: '30 minutes ago',
  },
  {
    id: '3',
    name: 'API Platform',
    slug: 'api-platform',
    description: 'Public API for third-party integrations',
    color: '#F59E0B',
    icon: 'code',
    status: 'active',
    isPinned: false,
    progress: 23,
    tasksCompleted: 7,
    totalTasks: 30,
    risk: 'none',
    nextMilestone: { name: 'API v1 Launch', dueDate: '2026-03-01' },
    owner: { name: 'Alex Kim' },
    teamSize: 3,
    updatedAt: '1 day ago',
  },
  {
    id: '4',
    name: 'Q1 Marketing Campaign',
    slug: 'q1-marketing',
    description: 'Integrated marketing campaign for Q1 2026',
    color: '#EC4899',
    icon: 'megaphone',
    status: 'active',
    isPinned: false,
    progress: 15,
    tasksCompleted: 3,
    totalTasks: 20,
    risk: 'medium',
    owner: { name: 'Lisa Park' },
    teamSize: 6,
    updatedAt: '3 days ago',
  },
];

const riskColors = {
  none: '',
  low: 'text-blue-600 bg-blue-50 border-blue-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200',
};

function ProjectCard({ project }: { project: ProjectData }) {
  const [isPinned, setIsPinned] = useState(project.isPinned);

  return (
    <Link
      href={`/app/projects/${project.slug}`}
      className={cn(
        'block p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800',
        'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all',
        'group'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: project.color }}
          >
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-zinc-500">
              Updated {project.updatedAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              setIsPinned(!isPinned);
            }}
          >
            {isPinned ? (
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit project</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Generate status update</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-500">Progress</span>
          <span className="text-xs font-medium">
            {project.tasksCompleted}/{project.totalTasks} tasks
          </span>
        </div>
        <Progress value={project.progress} className="h-1.5" />
      </div>

      {/* Risk & Milestone */}
      <div className="flex items-center justify-between mb-4">
        {project.risk !== 'none' && (
          <Badge variant="outline" className={cn('text-xs', riskColors[project.risk])}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            {project.risk} risk
          </Badge>
        )}
        {project.nextMilestone && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            <span>{project.nextMilestone.name}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">
              {project.owner.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-zinc-500">{project.owner.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Users className="h-3 w-3" />
          <span>{project.teamSize}</span>
        </div>
      </div>
    </Link>
  );
}

function ProjectRow({ project }: { project: ProjectData }) {
  const [isPinned, setIsPinned] = useState(project.isPinned);

  return (
    <Link
      href={`/app/projects/${project.slug}`}
      className={cn(
        'flex items-center gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800',
        'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
        'group'
      )}
    >
      {/* Icon */}
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: project.color }}
      >
        <FolderKanban className="h-4 w-4" />
      </div>

      {/* Name & Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
            {project.name}
          </h3>
          {isPinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
          {project.risk !== 'none' && (
            <Badge variant="outline" className={cn('text-[10px] h-5', riskColors[project.risk])}>
              {project.risk} risk
            </Badge>
          )}
        </div>
        {project.description && (
          <p className="text-xs text-zinc-500 truncate mt-0.5">
            {project.description}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="w-32 shrink-0">
        <div className="flex items-center gap-2">
          <Progress value={project.progress} className="h-1.5 flex-1" />
          <span className="text-xs text-zinc-500 w-8">{project.progress}%</span>
        </div>
      </div>

      {/* Owner */}
      <div className="w-32 shrink-0 flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px]">
            {project.owner.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-zinc-600 dark:text-zinc-300 truncate">
          {project.owner.name}
        </span>
      </div>

      {/* Updated */}
      <div className="w-24 shrink-0 text-xs text-zinc-500">
        {project.updatedAt}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            setIsPinned(!isPinned);
          }}
        >
          {isPinned ? (
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit project</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Generate status update</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated');

  const filteredProjects = mockProjects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    // Pinned projects first
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'progress':
        return b.progress - a.progress;
      case 'risk':
        const riskOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return riskOrder[a.risk] - riskOrder[b.risk];
      default:
        return 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Projects
          </h1>
          <p className="text-zinc-500 mt-1">
            {mockProjects.length} active projects
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="risk">Risk level</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>

        <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5">
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Projects */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* List Header */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <div className="w-9" />
            <div className="flex-1">Project</div>
            <div className="w-32">Progress</div>
            <div className="w-32">Owner</div>
            <div className="w-24">Updated</div>
            <div className="w-20" />
          </div>

          {/* List Items */}
          {sortedProjects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedProjects.length === 0 && (
        <div className="py-12 text-center">
          <FolderKanban className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-1">
            No projects found
          </h3>
          <p className="text-zinc-500 mb-4">
            {search ? `No projects matching "${search}"` : 'Get started by creating your first project'}
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      )}
    </div>
  );
}
