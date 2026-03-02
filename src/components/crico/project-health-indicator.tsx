'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface HealthData {
  overall_score: number;
  status: string;
}

interface ProjectHealthIndicatorProps {
  projectId: string;
  className?: string;
}

export function ProjectHealthIndicator({ projectId, className }: ProjectHealthIndicatorProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/crico/projects/${projectId}/health`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setHealth(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const colorClass = loading
    ? 'bg-muted animate-pulse'
    : health?.status === 'healthy'
    ? 'bg-emerald-500'
    : health?.status === 'at_risk'
    ? 'bg-amber-500'
    : health?.status === 'critical'
    ? 'bg-rose-500'
    : 'bg-zinc-400';

  return (
    <span
      className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', colorClass, className)}
      title={
        loading
          ? 'Loading health...'
          : health
          ? `Health: ${health.overall_score}/100 (${health.status})`
          : 'Health unavailable'
      }
    />
  );
}
