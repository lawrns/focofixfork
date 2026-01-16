'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Search,
  MoreHorizontal,
  Star,
  StarOff,
  Trash2,
  Edit,
  Copy,
  ChevronRight,
  Clock,
  Users,
  Zap,
  FileQuestion,
  CheckSquare,
  BookOpen,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  template_type?: string;
}

interface DocFolder {
  id: string;
  name: string;
  parent_id: string | null;
  is_expanded: boolean;
}

const documentTemplates = [
  { id: 'blank', name: 'Blank Document', icon: FileText, description: 'Start with a clean slate' },
  { id: 'meeting', name: 'Meeting Notes', icon: Users, description: 'Template for meeting documentation' },
  { id: 'project-brief', name: 'Project Brief', icon: BookOpen, description: 'Define project scope and goals' },
  { id: 'task-spec', name: 'Task Specification', icon: CheckSquare, description: 'Technical task specification' },
  { id: 'brainstorm', name: 'Brainstorm', icon: Lightbulb, description: 'Ideas and exploration' },
  { id: 'faq', name: 'FAQ Document', icon: FileQuestion, description: 'Frequently asked questions' },
];

const templateContent: Record<string, string> = {
  blank: '',
  meeting: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 

## Agenda
1. 

## Discussion Notes


## Action Items
- [ ] 

## Next Steps

`,
  'project-brief': `# Project Brief

## Overview
Brief description of the project.

## Goals
- 

## Scope
### In Scope
- 

### Out of Scope
- 

## Timeline
| Phase | Start | End |
|-------|-------|-----|
| Discovery | | |
| Design | | |
| Development | | |
| Launch | | |

## Success Metrics
- 

## Stakeholders
- 

`,
  'task-spec': `# Task Specification

## Summary
Brief description of the task.

## Requirements
### Functional Requirements
- 

### Non-Functional Requirements
- 

## Technical Details

## Acceptance Criteria
- [ ] 

## Dependencies
- 

## Estimates
**Effort:** 
**Risk:** 

`,
  brainstorm: `# Brainstorm Session

**Topic:** 
**Date:** ${new Date().toLocaleDateString()}

## Ideas
1. 

## Pros/Cons Analysis

| Idea | Pros | Cons |
|------|------|------|
| | | |

## Next Steps
- 

`,
  faq: `# Frequently Asked Questions

## General

### Q: 
A: 

## Technical

### Q: 
A: 

## Process

### Q: 
A: 

`,
};

function DocumentEditor({
  document,
  onUpdate,
  onClose,
}: {
  document: Document;
  onUpdate: (doc: Document) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title !== document.title || content !== document.content) {
        setIsSaving(true);
        try {
          // Simulate API save
          await new Promise(resolve => setTimeout(resolve, 500));
          onUpdate({ ...document, title, content, updated_at: new Date().toISOString() });
          setLastSaved(new Date());
        } finally {
          setIsSaving(false);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, document, onUpdate]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            ← Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
            placeholder="Untitled Document"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          {isSaving && <span>Saving...</span>}
          {lastSaved && !isSaving && (
            <span>Saved {lastSaved.toLocaleTimeString()}</span>
          )}
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4" />
            AI Assist
          </Button>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full min-h-[500px] resize-none bg-transparent border-none outline-none text-base leading-relaxed font-mono"
          placeholder="Start writing... (Markdown supported)"
        />
      </div>
    </div>
  );
}

function FolderTree({
  folders,
  documents,
  selectedFolder,
  onSelectFolder,
  onSelectDocument,
  onToggleFolder,
}: {
  folders: DocFolder[];
  documents: Document[];
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  onSelectDocument: (doc: Document) => void;
  onToggleFolder: (id: string) => void;
}) {
  const rootFolders = folders.filter(f => !f.parent_id);
  const rootDocs = documents.filter(d => !d.folder_id);

  const renderFolder = (folder: DocFolder, depth: number = 0) => {
    const childFolders = folders.filter(f => f.parent_id === folder.id);
    const childDocs = documents.filter(d => d.folder_id === folder.id);
    const isSelected = selectedFolder === folder.id;

    return (
      <div key={folder.id}>
        <button
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
            isSelected
              ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            onSelectFolder(folder.id);
            onToggleFolder(folder.id);
          }}
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 transition-transform',
              folder.is_expanded && 'rotate-90'
            )}
          />
          {folder.is_expanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )}
          <span className="truncate">{folder.name}</span>
        </button>
        {folder.is_expanded && (
          <>
            {childFolders.map(f => renderFolder(f, depth + 1))}
            {childDocs.map(doc => (
              <button
                key={doc.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
                onClick={() => onSelectDocument(doc)}
              >
                <FileText className="h-4 w-4 text-zinc-400" />
                <span className="truncate">{doc.title}</span>
                {doc.is_starred && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
              </button>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        <button
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
            selectedFolder === null
              ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
          onClick={() => onSelectFolder(null)}
        >
          <FileText className="h-4 w-4 text-zinc-400" />
          <span>All Documents</span>
        </button>

        <Separator className="my-2" />

        {rootFolders.map(folder => renderFolder(folder))}

        {rootDocs.map(doc => (
          <button
            key={doc.id}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => onSelectDocument(doc)}
          >
            <FileText className="h-4 w-4 text-zinc-400" />
            <span className="truncate">{doc.title}</span>
            {doc.is_starred && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function DocsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if we should open create dialog from URL
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowNewDocDialog(true);
    }
  }, [searchParams]);

  // Simulate loading documents
  useEffect(() => {
    const timer = setTimeout(() => {
      // Demo documents
      setDocuments([
        {
          id: '1',
          title: 'Product Roadmap Q1',
          content: '# Product Roadmap Q1\n\n## Goals\n- Launch v2.0\n- Improve onboarding\n- Add AI features',
          folder_id: 'f1',
          is_starred: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id || '',
        },
        {
          id: '2',
          title: 'Engineering Guidelines',
          content: '# Engineering Guidelines\n\n## Code Standards\n- Use TypeScript\n- Write tests\n- Document APIs',
          folder_id: 'f1',
          is_starred: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id || '',
        },
        {
          id: '3',
          title: 'Meeting Notes - Sprint Planning',
          content: '# Sprint Planning\n\n## Date: Jan 15, 2026\n\n## Attendees\n- Team Lead\n- Engineers',
          folder_id: null,
          is_starred: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id || '',
        },
      ]);
      setFolders([
        { id: 'f1', name: 'Product', parent_id: null, is_expanded: true },
        { id: 'f2', name: 'Engineering', parent_id: null, is_expanded: false },
        { id: 'f3', name: 'Design', parent_id: null, is_expanded: false },
      ]);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [user]);

  const handleToggleFolder = (id: string) => {
    setFolders(prev =>
      prev.map(f =>
        f.id === id ? { ...f, is_expanded: !f.is_expanded } : f
      )
    );
  };

  const handleCreateDocument = (templateId: string) => {
    const template = documentTemplates.find(t => t.id === templateId);
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: template?.name === 'Blank Document' ? 'Untitled Document' : template?.name || 'New Document',
      content: templateContent[templateId] || '',
      folder_id: selectedFolder,
      is_starred: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user?.id || '',
      template_type: templateId,
    };
    setDocuments(prev => [...prev, newDoc]);
    setSelectedDocument(newDoc);
    setShowNewDocDialog(false);
    toast.success('Document created');
  };

  const handleUpdateDocument = (doc: Document) => {
    setDocuments(prev =>
      prev.map(d => (d.id === doc.id ? doc : d))
    );
    setSelectedDocument(doc);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
    toast.success('Document deleted');
  };

  const handleToggleStar = (id: string) => {
    setDocuments(prev =>
      prev.map(d =>
        d.id === id ? { ...d, is_starred: !d.is_starred } : d
      )
    );
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === null || doc.folder_id === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  if (selectedDocument) {
    return (
      <div className="h-[calc(100vh-3.5rem)]">
        <DocumentEditor
          document={selectedDocument}
          onUpdate={handleUpdateDocument}
          onClose={() => setSelectedDocument(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <div className="p-4">
          <Button
            className="w-full"
            onClick={() => setShowNewDocDialog(true)}
          >
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>
        <FolderTree
          folders={folders}
          documents={documents}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onSelectDocument={setSelectedDocument}
          onToggleFolder={handleToggleFolder}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-zinc-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
              <p className="text-zinc-500 mb-4">
                Create your first document to get started
              </p>
              <Button onClick={() => setShowNewDocDialog(true)}>
                <Plus className="h-4 w-4" />
                Create Document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-zinc-400" />
                      <h3 className="font-medium truncate">{doc.title}</h3>
                    </div>
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
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(doc.id);
                        }}>
                          {doc.is_starred ? (
                            <>
                              <StarOff className="h-4 w-4" />
                              Remove star
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4" />
                              Add star
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-3">
                    {doc.content.slice(0, 100).replace(/[#*]/g, '')}...
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {new Date(doc.updated_at).toLocaleDateString()}
                    {doc.is_starred && (
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500 ml-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* New Document Dialog */}
      <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
            {documentTemplates.map(template => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  className="flex flex-col items-center p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-left"
                  onClick={() => handleCreateDocument(template.id)}
                >
                  <Icon className="h-8 w-8 text-zinc-400 mb-2" />
                  <span className="font-medium text-sm">{template.name}</span>
                  <span className="text-xs text-zinc-500 text-center mt-1">
                    {template.description}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <DocsPageContent />
    </Suspense>
  );
}
