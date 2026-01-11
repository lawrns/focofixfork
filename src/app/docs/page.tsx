'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  FileText,
  FolderOpen,
  Plus,
  Search,
  MoreHorizontal,
  Star,
  Clock,
  Users,
  Lock,
  Zap,
  ChevronRight,
  File,
  FileCode,
  FilePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocItem {
  id: string;
  title: string;
  type: 'doc' | 'folder';
  template?: string;
  project?: { name: string; color: string };
  lastEditedBy?: string;
  lastEditedAt: string;
  isStarred?: boolean;
  isLocked?: boolean;
  children?: DocItem[];
}

const docs: DocItem[] = [
  {
    id: '1',
    title: 'Website Redesign PRD',
    type: 'doc',
    template: 'PRD',
    project: { name: 'Website Redesign', color: '#6366F1' },
    lastEditedBy: 'Sarah Chen',
    lastEditedAt: '2 hours ago',
    isStarred: true,
  },
  {
    id: '2',
    title: 'Design System Guidelines',
    type: 'doc',
    project: { name: 'Website Redesign', color: '#6366F1' },
    lastEditedBy: 'Mike Johnson',
    lastEditedAt: '1 day ago',
  },
  {
    id: '3',
    title: 'Mobile App v2 Technical Spec',
    type: 'doc',
    project: { name: 'Mobile App v2', color: '#10B981' },
    lastEditedBy: 'Alex Kim',
    lastEditedAt: '3 days ago',
    isStarred: true,
  },
  {
    id: '4',
    title: 'API Documentation',
    type: 'folder',
    lastEditedAt: '1 week ago',
    children: [
      { id: '4-1', title: 'Authentication', type: 'doc', lastEditedAt: '1 week ago' },
      { id: '4-2', title: 'Endpoints', type: 'doc', lastEditedAt: '1 week ago' },
      { id: '4-3', title: 'Rate Limits', type: 'doc', lastEditedAt: '2 weeks ago' },
    ],
  },
  {
    id: '5',
    title: 'Meeting Notes',
    type: 'folder',
    lastEditedAt: '2 days ago',
    children: [
      { id: '5-1', title: 'Sprint Planning - Jan 6', type: 'doc', template: 'Meeting Notes', lastEditedAt: '4 days ago' },
      { id: '5-2', title: 'Design Review - Jan 8', type: 'doc', template: 'Meeting Notes', lastEditedAt: '2 days ago' },
    ],
  },
  {
    id: '6',
    title: 'Q4 2025 Retrospective',
    type: 'doc',
    template: 'Retro',
    lastEditedBy: 'Lisa Park',
    lastEditedAt: '1 week ago',
    isLocked: true,
  },
];

const templates = [
  { id: 'prd', name: 'PRD', description: 'Product Requirements Document', icon: FileCode },
  { id: 'meeting', name: 'Meeting Notes', description: 'Structured meeting notes', icon: FileText },
  { id: 'decision', name: 'Decision Log', description: 'Track key decisions', icon: File },
  { id: 'retro', name: 'Retrospective', description: 'Sprint or project retro', icon: FilePlus },
];

const recentDocs = docs.filter(d => d.type === 'doc').slice(0, 4);

function DocRow({ doc, indent = 0 }: { doc: DocItem; indent?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFolder = doc.type === 'folder';

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group',
          indent > 0 && 'border-l-2 border-zinc-100 dark:border-zinc-800 ml-6'
        )}
        onClick={() => isFolder && setIsExpanded(!isExpanded)}
      >
        {/* Icon */}
        <div className="shrink-0">
          {isFolder ? (
            <div className="flex items-center">
              <ChevronRight className={cn(
                'h-4 w-4 text-zinc-400 transition-transform',
                isExpanded && 'rotate-90'
              )} />
              <FolderOpen className="h-4 w-4 text-amber-500 ml-1" />
            </div>
          ) : (
            <FileText className="h-4 w-4 text-zinc-400" />
          )}
        </div>

        {/* Title & Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">
              {doc.title}
            </span>
            {doc.isStarred && (
              <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
            )}
            {doc.isLocked && (
              <Lock className="h-3 w-3 text-zinc-400 shrink-0" />
            )}
            {doc.template && (
              <Badge variant="outline" className="h-5 text-[10px]">
                {doc.template}
              </Badge>
            )}
          </div>
          {doc.project && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div 
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: doc.project.color }}
              />
              <span className="text-xs text-zinc-500">{doc.project.name}</span>
            </div>
          )}
        </div>

        {/* Last Edited */}
        <div className="shrink-0 text-xs text-zinc-400">
          {doc.lastEditedBy && (
            <span>{doc.lastEditedBy} • </span>
          )}
          {doc.lastEditedAt}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Star className="h-4 w-4 mr-2" />
              {doc.isStarred ? 'Unstar' : 'Star'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Zap className="h-4 w-4 mr-2" />
              Summarize with AI
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem>Move to...</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isFolder && isExpanded && doc.children && (
        <div>
          {doc.children.map((child) => (
            <DocRow key={child.id} doc={child} indent={indent + 1} />
          ))}
        </div>
      )}
    </>
  );
}

function RecentDocsSection() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          Recent Documents
        </h2>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {recentDocs.map((doc) => (
          <Link
            key={doc.id}
            href={`/app/docs/${doc.id}`}
            className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <FileText className="h-5 w-5 text-zinc-400" />
              {doc.isStarred && (
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              )}
            </div>
            <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-50 mb-1 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {doc.title}
            </h3>
            <p className="text-xs text-zinc-500">
              {doc.lastEditedAt}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TemplatesSection() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <FilePlus className="h-4 w-4 text-zinc-500" />
          Start from Template
        </h2>
      </div>
      <div className="flex gap-3">
        {templates.map((template) => (
          <Button
            key={template.id}
            variant="outline"
            className="flex-1 h-auto py-3 flex flex-col items-center gap-2"
          >
            <template.icon className="h-5 w-5 text-zinc-500" />
            <span className="font-medium text-sm">{template.name}</span>
            <span className="text-xs text-zinc-400">{template.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [search, setSearch] = useState('');

  const filteredDocs = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Docs
          </h1>
          <p className="text-zinc-500 mt-1">
            Project documentation and knowledge base
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Doc
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search docs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {/* Recent Docs */}
      {!search && <RecentDocsSection />}

      {/* Templates */}
      {!search && <TemplatesSection />}

      {/* All Docs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-zinc-500" />
            All Documents
          </h2>
          <span className="text-xs text-zinc-400">
            {filteredDocs.length} items
          </span>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {filteredDocs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                No documents found
              </h3>
              <p className="text-zinc-500 mb-4">
                {search ? `No documents matching "${search}"` : 'Create your first document to get started'}
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Document
              </Button>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <DocRow key={doc.id} doc={doc} />
            ))
          )}
        </div>
      </div>

      {/* AI Tip */}
      <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              AI-Powered Docs
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
              Use AI to summarize documents, extract tasks, or create decision log entries. 
              Just click the <Zap className="h-3 w-3 inline" /> icon on any document.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
