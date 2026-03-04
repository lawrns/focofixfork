'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  MoreHorizontal,
  Copy,
  Plus,
  Trash2,
  FolderInput,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkItem } from '@/types/foco';

interface TaskHeaderProps {
  workItem: WorkItem;
  isMobile: boolean;
  onBack: () => void;
  onFocus: () => void;
  onCopyLink: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function TaskHeader({
  workItem,
  isMobile,
  onBack,
  onFocus,
  onCopyLink,
  onDuplicate,
  onDelete,
}: TaskHeaderProps) {
  const menuItems = (
    <>
      <DropdownMenuItem onClick={onCopyLink}>
        <Copy className="h-4 w-4 mr-2" />
        Copy link
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onDuplicate}>
        <Plus className="h-4 w-4 mr-2" />
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => console.log('Move to project clicked')}>
        <FolderInput className="h-4 w-4 mr-2" />
        Move to project...
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-red-600" onClick={onDelete}>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </DropdownMenuItem>
    </>
  );

  if (isMobile) {
    return (
      <div className="sticky top-0 -mx-6 -mt-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 mb-6 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-500 truncate">TASK-{workItem.id}</div>
            <div className="text-sm font-medium truncate">{(workItem.project as any)?.name}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
          <Link
            href={`/projects/${(workItem.project as any)?.slug}`}
            className="hover:text-[color:var(--foco-teal)]"
          >
            {(workItem.project as any)?.name}
          </Link>
          <span>/</span>
          <span>TASK-{workItem.id}</span>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onFocus}>
        <Play className="h-4 w-4" />
        Focus
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
