'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SurfaceType } from '../types';

interface SurfaceCapabilityBadgeProps {
  type?: SurfaceType;
  surfaceType?: SurfaceType; // Alias for compatibility
  capabilities?: string[];
  status?: 'available' | 'busy' | 'disabled';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SURFACE_STYLES: Record<SurfaceType, { 
  icon: string; 
  label: string;
  bg: string;
  text: string;
}> = {
  browser: {
    icon: '🌐',
    label: 'Browser',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  file_system: {
    icon: '📁',
    label: 'File System',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  api: {
    icon: '🔌',
    label: 'API',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  communication: {
    icon: '💬',
    label: 'Communication',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
  },
  calendar: {
    icon: '📅',
    label: 'Calendar',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
  },
};

const STATUS_STYLES = {
  available: 'ring-1 ring-emerald-500/30',
  busy: 'ring-1 ring-amber-500/30 opacity-70',
  disabled: 'ring-1 ring-gray-300 opacity-50 grayscale',
};

export function SurfaceCapabilityBadge({
  type,
  surfaceType,
  capabilities = [],
  status = 'available',
  showLabel,
  size = 'md',
  className,
}: SurfaceCapabilityBadgeProps) {
  const actualType = type || surfaceType || 'browser';
  const style = SURFACE_STYLES[actualType];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        style.bg,
        style.text,
        STATUS_STYLES[status],
        className
      )}
    >
      <span>{style.icon}</span>
      <span>{style.label}</span>
      {capabilities.length > 0 && (
        <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1">
          {capabilities.length}
        </Badge>
      )}
    </div>
  );
}

export function SurfaceTypeIcon({ type, className }: { type: SurfaceType; className?: string }) {
  return (
    <span className={cn('text-base', className)}>
      {SURFACE_STYLES[type]?.icon || '🔧'}
    </span>
  );
}

export function SurfaceTypeLabel({ type }: { type: SurfaceType }) {
  return <span>{SURFACE_STYLES[type]?.label || type}</span>;
}
