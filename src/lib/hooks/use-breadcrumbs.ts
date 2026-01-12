'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export interface Breadcrumb {
  label: string;
  href?: string;
  isCurrent: boolean;
  truncated?: string;
}

export function useBreadcrumbs(projectName?: string, taskTitle?: string): Breadcrumb[] {
  const pathname = usePathname();

  return useMemo(() => {
    const breadcrumbs: Breadcrumb[] = [];

    // Dashboard page: /dashboard
    if (pathname === '/dashboard') {
      return [
        {
          label: 'Dashboard',
          isCurrent: true,
        },
      ];
    }

    // Always start with Home for authenticated pages (except dashboard)
    if (!pathname.includes('/login') && !pathname.includes('/register')) {
      breadcrumbs.push({
        label: 'Home',
        href: '/dashboard',
        isCurrent: false,
      });
    }

    // Projects page: /projects
    if (pathname === '/projects') {
      breadcrumbs.push({
        label: 'Projects',
        isCurrent: true,
      });
      return breadcrumbs;
    }

    // Project detail page: /projects/[slug] or /projects/[slug]/...
    if (pathname.includes('/projects/')) {
      breadcrumbs.push({
        label: 'Projects',
        href: '/projects',
        isCurrent: false,
      });

      if (projectName) {
        const truncatedName = truncateText(projectName, 30);
        // Check if we have a task (meaning project is not current)
        if (taskTitle) {
          breadcrumbs.push({
            label: projectName,
            href: pathname.split('/tasks')[0], // Navigate to project root
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
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      const label = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
      breadcrumbs.push({
        label,
        isCurrent: true,
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
