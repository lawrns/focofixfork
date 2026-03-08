'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export interface Breadcrumb {
  label: string;
  href?: string;
  isCurrent: boolean;
  truncated?: string;
}

// Map URL segments to user-facing labels where they differ from capitalized segment
const SEGMENT_LABELS: Record<string, string> = {
  'proposals': 'Task Proposals',
  'my-work': 'My Tasks',
  'ledger': 'Audit Log',
  'clawdbot': 'Intel Feed',
  'crons': 'Crons',
  'empire': 'Empire OS',
  'command': 'Command Center',
  'agents': 'Agents',
  'pipeline': 'Pipeline',
  'briefing': 'Daily Briefing',
  'missions': 'Projects',
  'fleet': 'Agent Fleet',
  'signals': 'Notifications',
  'timeline': 'Milestone Timeline',
  'policies': 'Fleet Policies',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function formatGenericSegment(segment: string): { label: string; truncated?: string } {
  const normalized = decodeURIComponent(segment)
  const label = SEGMENT_LABELS[normalized] ?? (normalized.charAt(0).toUpperCase() + normalized.slice(1))

  if (UUID_RE.test(normalized)) {
    return {
      label: normalized,
      truncated: `${normalized.slice(0, 8)}...${normalized.slice(-4)}`,
    }
  }

  const truncated = truncateText(label, 28)
  return {
    label,
    truncated: truncated !== label ? truncated : undefined,
  }
}

export function useBreadcrumbs(projectName?: string, taskTitle?: string): Breadcrumb[] {
  const pathname = usePathname();

  return useMemo(() => {
    const breadcrumbs: Breadcrumb[] = [];
    const currentPath = pathname ?? '';

    // Dashboard page: /dashboard
    if (currentPath === '/dashboard') {
      return [
        {
          label: 'Dashboard',
          isCurrent: true,
        },
      ];
    }

    // Always start with Home for authenticated pages (except dashboard)
    if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
      breadcrumbs.push({
        label: 'Home',
        href: '/dashboard',
        isCurrent: false,
      });
    }

    // Projects page: /empire/missions (canonical list)
    if (currentPath === '/empire/missions') {
      breadcrumbs.push({
        label: 'Projects',
        isCurrent: true,
      });
      return breadcrumbs;
    }

    // Project detail page: /projects/[slug] (canonical detail) or /empire/missions/[slug] (legacy alias)
    if (currentPath.includes('/projects/') || currentPath.includes('/empire/missions/')) {
      breadcrumbs.push({
        label: 'Projects',
        href: '/empire/missions',
        isCurrent: false,
      });

      if (projectName) {
        const truncatedName = truncateText(projectName, 30);
        // Check if we have a task (meaning project is not current)
        if (taskTitle) {
          breadcrumbs.push({
            label: projectName,
            href: currentPath.split('/tasks')[0], // Navigate to project root
            isCurrent: false,
            truncated: truncatedName !== projectName ? truncatedName : undefined,
          });
        } else {
          // Project is current page
          breadcrumbs.push({
            label: projectName,
            isCurrent: true,
            truncated: truncatedName !== projectName ? truncatedName : undefined,
          });
        }
      }

      // Task detail page
      if (taskTitle) {
        const truncatedTitle = truncateText(taskTitle, 30);
        breadcrumbs.push({
          label: taskTitle,
          isCurrent: true,
          truncated: truncatedTitle !== taskTitle ? truncatedTitle : undefined,
        });
      }

      return breadcrumbs;
    }

    // Other authenticated pages (settings, etc.)
    const segments = currentPath.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      const formatted = formatGenericSegment(lastSegment)
      breadcrumbs.push({
        label: formatted.label,
        isCurrent: true,
        truncated: formatted.truncated,
      });
    }

    return breadcrumbs;
  }, [pathname, projectName, taskTitle]);
}

/**
 * Truncates text to specified length and adds ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}
