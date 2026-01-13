'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { TableHeader, TableHead, TableRow } from '@/components/ui/table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { SortCondition } from '@/lib/services/filtering'
import { getSortDirection } from './project-table-utils'

interface ProjectTableHeaderProps {
  allSelected: boolean
  someSelected: boolean
  onSelectAll: (checked: boolean) => void
  sortConditions: SortCondition[]
  onToggleSort: (field: string) => void
}

function SortIcon({ field, sortConditions }: { field: string; sortConditions: SortCondition[] }) {
  const direction = getSortDirection(sortConditions, field)
  if (!direction) return <ArrowUpDown className="h-3 w-3" />
  return direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  )
}

export function ProjectTableHeader({
  allSelected,
  someSelected,
  onSelectAll,
  sortConditions,
  onToggleSort
}: ProjectTableHeaderProps) {
  return (
    <TableHeader className="sticky top-0 z-10 bg-muted/50">
      <TableRow>
        <TableHead style={{ width: '50px', display: 'table-cell !important' }} className="px-3 py-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
            aria-label="Select all projects"
            className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
          />
        </TableHead>
        <TableHead
          style={{ width: '25%', minWidth: '200px', display: 'table-cell !important' }}
          className="px-3 py-3 cursor-pointer select-none"
          onClick={() => onToggleSort('name')}
        >
          <div className="inline-flex items-center gap-1">
            Name <SortIcon field="name" sortConditions={sortConditions} />
          </div>
        </TableHead>
        <TableHead
          style={{ width: '120px', display: 'table-cell !important' }}
          className="px-3 py-3 cursor-pointer select-none"
          onClick={() => onToggleSort('status')}
        >
          <div className="inline-flex items-center gap-1">
            Status <SortIcon field="status" sortConditions={sortConditions} />
          </div>
        </TableHead>
        <TableHead
          style={{ width: '120px', display: 'table-cell !important' }}
          className="px-3 py-3 cursor-pointer select-none"
          onClick={() => onToggleSort('due_date')}
        >
          <div className="inline-flex items-center gap-1">
            Due Date <SortIcon field="due_date" sortConditions={sortConditions} />
          </div>
        </TableHead>
        <TableHead
          style={{ width: '140px', display: 'table-cell !important' }}
          className="px-3 py-3 cursor-pointer select-none"
          onClick={() => onToggleSort('organizations.name')}
        >
          <div className="inline-flex items-center gap-1">
            Organization <SortIcon field="organizations.name" sortConditions={sortConditions} />
          </div>
        </TableHead>
        <TableHead
          style={{ width: '100px', display: 'table-cell !important' }}
          className="px-3 py-3 cursor-pointer select-none"
          onClick={() => onToggleSort('priority')}
        >
          <div className="inline-flex items-center gap-1">
            Priority <SortIcon field="priority" sortConditions={sortConditions} />
          </div>
        </TableHead>
        <TableHead style={{ width: '90px', display: 'table-cell !important' }} className="px-3 py-3 text-right">
          Actions
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}
