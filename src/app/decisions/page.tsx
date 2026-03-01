'use client'

import { useState, useEffect } from 'react'
import { 
  Terminal, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CommandSurface } from '@/components/command-surface'
import type { CommandExecution } from '@/components/command-surface'

type DecisionRecord = {
  id: string
  type: 'cto' | 'coo'
  decisionType: string
  title: string
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed'
  createdAt: string
  executedAt?: string
  result?: string
  executionId?: string
}

export default function DecisionsPage() {
  const { user, loading } = useAuth()
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function loadData() {
    setRefreshing(true)
    try {
      // Fetch ledger events for command decisions
      const res = await fetch('/api/ledger?limit=50')
      const data = await res.json()
      
      const commandEvents = (data.data || []).filter((e: any) => 
        e.type === 'command_initiated' || 
        e.type === 'command_completed' || 
        e.type === 'command_failed'
      )
      
      // Process into decision records
      const records: DecisionRecord[] = commandEvents
        .filter((e: any) => e.payload?.mode === 'cto' || e.payload?.mode === 'coo')
        .map((e: any) => ({
          id: e.id,
          type: e.payload?.mode,
          decisionType: e.payload?.decisionType || 'execution',
          title: e.payload?.prompt?.slice(0, 60) + '...' || 'Command execution',
          description: e.payload?.prompt || '',
          status: e.type === 'command_completed' ? 'completed' : 
                  e.type === 'command_failed' ? 'failed' : 'pending',
          createdAt: e.timestamp,
          executedAt: e.type !== 'command_initiated' ? e.timestamp : undefined,
          executionId: e.payload?.executionId
        }))
      
      setDecisions(records)
    } catch (error) {
      console.error('Failed to load decisions:', error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) loadData()
  }, [user])

  // Auto-refresh every 10 seconds when on this page
  useEffect(() => {
    if (!user) return
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" />
      </div>
    )
  }

  if (!user) return null

  const pendingDecisions = decisions.filter(d => d.status === 'pending')
  const completedDecisions = decisions.filter(d => d.status === 'completed')
  const failedDecisions = decisions.filter(d => d.status === 'failed')

  return (
    <PageShell>
      <PageHeader
        title="Decision Queue"
        subtitle="CTO/COO command decisions and executions"
        primaryAction={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline ml-1">Refresh</span>
          </Button>
        }
      />

      <CommandSurface 
        context="decision-queue"
        className="mb-6"
        onExecutionComplete={() => {
          // Refresh after command execution
          setTimeout(loadData, 1000)
        }}
      />

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">
            All ({decisions.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Pending ({pendingDecisions.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Completed ({completedDecisions.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="failed">
            <span className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" />
              Failed ({failedDecisions.length})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DecisionList decisions={decisions} />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DecisionList decisions={pendingDecisions} />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <DecisionList decisions={completedDecisions} />
        </TabsContent>

        <TabsContent value="failed" className="mt-4">
          <DecisionList decisions={failedDecisions} />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}

function DecisionList({ decisions }: { decisions: DecisionRecord[] }) {
  if (decisions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Filter className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No decisions found</p>
          <p className="text-xs text-muted-foreground">
            Use the Command Surface above to create CTO or COO decisions
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {decisions.map(decision => (
        <DecisionCard key={decision.id} decision={decision} />
      ))}
    </div>
  )
}

function DecisionCard({ decision }: { decision: DecisionRecord }) {
  const isCTO = decision.type === 'cto'
  const isCOO = decision.type === 'coo'

  return (
    <Card className={cn(
      'p-4 transition-colors',
      decision.status === 'pending' && 'border-yellow-200 bg-yellow-50/30 dark:border-yellow-800 dark:bg-yellow-950/10',
      decision.status === 'completed' && 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10',
      decision.status === 'failed' && 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg shrink-0',
          isCTO && 'bg-blue-100 dark:bg-blue-900',
          isCOO && 'bg-emerald-100 dark:bg-emerald-900'
        )}>
          {isCTO ? (
            <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{decision.title}</span>
            <Badge 
              variant="outline"
              className={cn(
                'text-xs',
                isCTO && 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400',
                isCOO && 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400'
              )}
            >
              {decision.type.toUpperCase()}
            </Badge>
            <StatusBadge status={decision.status} />
          </div>

          <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Created: {new Date(decision.createdAt).toLocaleString()}</span>
            {decision.executedAt && (
              <span>Executed: {new Date(decision.executedAt).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    },
    approved: {
      label: 'Approved',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    },
    completed: {
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    }
  }

  const config = configs[status] || configs.pending

  return (
    <Badge className={cn('text-[10px]', config.className)}>
      {config.label}
    </Badge>
  )
}
