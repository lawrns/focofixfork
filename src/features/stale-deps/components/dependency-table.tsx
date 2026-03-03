'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  ShieldAlert,
  PackageX,
  MoreHorizontal,
  ExternalLink,
  Plus,
  Eye,
  ArrowUpCircle,
  Calendar,
} from 'lucide-react';
import type { DependencySnapshot } from '../types';

interface DependencyTableProps {
  snapshots: DependencySnapshot[];
  projectId?: string;
  onCreateTask?: (snapshot: DependencySnapshot) => void;
}

type SortField = 'package_name' | 'severity' | 'staleness_days';
type SortDirection = 'asc' | 'desc';

const severityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
  info: 4,
};

export function DependencyTable({
  snapshots,
  projectId,
  onCreateTask,
}: DependencyTableProps) {
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedSnapshots = [...snapshots].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'package_name':
        comparison = a.package_name.localeCompare(b.package_name);
        break;
      case 'severity':
        comparison =
          (severityOrder[a.severity || 'info'] || 5) -
          (severityOrder[b.severity || 'info'] || 5);
        break;
      case 'staleness_days':
        comparison = (a.staleness_days || 0) - (b.staleness_days || 0);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getSeverityBadge = (severity?: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      critical: { variant: 'destructive', className: '' },
      high: { variant: 'default', className: 'bg-orange-500 hover:bg-orange-600' },
      moderate: { variant: 'default', className: 'bg-amber-500 hover:bg-amber-600' },
      low: { variant: 'secondary', className: 'text-blue-600 bg-blue-100 hover:bg-blue-200' },
      info: { variant: 'outline', className: 'text-muted-foreground' },
    };

    const config = variants[severity || 'info'] || variants.info;
    return (
      <Badge variant={config.variant} className={`text-[10px] ${config.className}`}>
        {severity || 'ok'}
      </Badge>
    );
  };

  const getStatusBadges = (snapshot: DependencySnapshot) => {
    const badges = [];

    if (snapshot.is_deprecated) {
      badges.push(
        <Tooltip key="deprecated">
          <TooltipTrigger>
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Deprecated
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This package is deprecated</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (snapshot.is_unused) {
      badges.push(
        <Tooltip key="unused">
          <TooltipTrigger>
            <Badge variant="outline" className="text-gray-600 border-gray-300 text-[10px]">
              <PackageX className="h-3 w-3 mr-1" />
              Unused
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This package may not be used in your code</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (snapshot.security_advisories.length > 0) {
      badges.push(
        <Tooltip key="security">
          <TooltipTrigger>
            <Badge
              variant="outline"
              className="text-red-600 border-red-300 text-[10px]"
            >
              <ShieldAlert className="h-3 w-3 mr-1" />
              {snapshot.security_advisories.length} issues
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <ul className="text-xs space-y-1">
              {snapshot.security_advisories.slice(0, 3).map((adv) => (
                <li key={adv.id}>{adv.title}</li>
              ))}
              {snapshot.security_advisories.length > 3 && (
                <li>+{snapshot.security_advisories.length - 3} more</li>
              )}
            </ul>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (snapshot.latest_version && snapshot.current_version !== snapshot.latest_version) {
      badges.push(
        <Tooltip key="outdated">
          <TooltipTrigger>
            <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px]">
              <ArrowUpCircle className="h-3 w-3 mr-1" />
              Update available
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Latest: {snapshot.latest_version}
              {snapshot.staleness_days && ` (${snapshot.staleness_days} days old)`}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return badges;
  };

  const formatStaleness = (days?: number) => {
    if (!days) return '-';
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('package_name')}
            >
              Package {sortField === 'package_name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Latest</TableHead>
            <TableHead>Status</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('severity')}
            >
              Severity {sortField === 'severity' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('staleness_days')}
            >
              Age {sortField === 'staleness_days' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSnapshots.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No dependencies found
              </TableCell>
            </TableRow>
          ) : (
            sortedSnapshots.map((snapshot) => (
              <TableRow key={snapshot.id}>
                <TableCell className="font-medium">
                  <Tooltip>
                    <TooltipTrigger className="text-left">
                      {snapshot.package_name}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to view on npm</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {snapshot.current_version}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {snapshot.latest_version ? (
                    <span
                      className={
                        snapshot.latest_version !== snapshot.current_version
                          ? 'text-emerald-600 font-medium'
                          : ''
                      }
                    >
                      {snapshot.latest_version}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getStatusBadges(snapshot)}
                  </div>
                </TableCell>
                <TableCell>{getSeverityBadge(snapshot.severity)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatStaleness(snapshot.staleness_days)}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://www.npmjs.com/package/${encodeURIComponent(
                            snapshot.package_name
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on npm
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          window.open(
                            `https://www.npmjs.com/package/${encodeURIComponent(
                              snapshot.package_name
                            )}/v/${encodeURIComponent(
                              snapshot.current_version.replace(/^[\^~>=<]+/, '')
                            )}`,
                            '_blank'
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {onCreateTask && (
                        <DropdownMenuItem onClick={() => onCreateTask(snapshot)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create task
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
