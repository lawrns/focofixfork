'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch,
  Plus,
  Filter,
  Search,
  Mic,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state-standard'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'

import { ProposalList } from '@/components/proposals/proposal-list'
import { ProposalDetailView } from '@/components/proposals/proposal-detail-view'
import { CreateProposalModal } from '@/components/proposals/create-proposal-modal'
import { ImpactDashboard, type ImpactDashboardData } from '@/components/proposals/impact-dashboard'
import type { Proposal, ProposalStatus, ProposalWithItems } from '@/types/proposals'

type FilterStatus = 'all' | ProposalStatus

export default function ProposalsPage() {
  const { user } = useAuth()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetail, setShowDetail] = useState(false)

  // Fetch proposals
  const fetchProposals = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('status', filter)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/proposals?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        console.error('Failed to fetch proposals:', response.status)
        toast.error('Failed to load proposals')
        return
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setProposals(data.data)
      } else {
        setProposals([])
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error)
      toast.error('Failed to load proposals')
      setProposals([])
    } finally {
      setIsLoading(false)
    }
  }, [user, filter, searchQuery])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  // Fetch proposal detail
  const handleSelectProposal = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/proposals/${id}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        toast.error('Failed to load proposal details')
        return
      }

      const data = await response.json()
      if (data.success && data.data) {
        setSelectedProposal(data.data)
        setShowDetail(true)
      }
    } catch (error) {
      console.error('Failed to fetch proposal:', error)
      toast.error('Failed to load proposal details')
    }
  }, [])

  const handleCreateProposal = useCallback((proposal: Proposal) => {
    setProposals(prev => [proposal, ...prev])
    setIsCreateModalOpen(false)
    toast.success('Proposal created successfully')
  }, [])

  const handleApprove = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/proposals/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        toast.error('Failed to approve proposal')
        return
      }

      toast.success('Proposal approved')
      fetchProposals()
      if (selectedProposal?.id === id) {
        handleSelectProposal(id)
      }
    } catch (error) {
      console.error('Failed to approve proposal:', error)
      toast.error('Failed to approve proposal')
    }
  }, [fetchProposals, selectedProposal?.id, handleSelectProposal])

  const handleReject = useCallback(async (id: string, reason: string) => {
    try {
      const response = await fetch(`/api/proposals/${id}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason }),
      })

      if (!response.ok) {
        toast.error('Failed to reject proposal')
        return
      }

      toast.success('Proposal rejected')
      fetchProposals()
      if (selectedProposal?.id === id) {
        handleSelectProposal(id)
      }
    } catch (error) {
      console.error('Failed to reject proposal:', error)
      toast.error('Failed to reject proposal')
    }
  }, [fetchProposals, selectedProposal?.id, handleSelectProposal])

  const handleMerge = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/proposals/${id}/apply`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        toast.error('Failed to merge proposal')
        return
      }

      toast.success('Proposal merged successfully! Changes have been applied.')
      fetchProposals()
      setShowDetail(false)
      setSelectedProposal(null)
    } catch (error) {
      console.error('Failed to merge proposal:', error)
      toast.error('Failed to merge proposal')
    }
  }, [fetchProposals])

  const handleBackToList = useCallback(() => {
    setShowDetail(false)
    setSelectedProposal(null)
  }, [])

  // Calculate summary stats
  const stats = {
    pending: proposals.filter(p => p.status === 'pending_review').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    draft: proposals.filter(p => p.status === 'draft').length,
  }

  const filteredProposals = proposals.filter(proposal => {
    if (filter !== 'all' && proposal.status !== filter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        proposal.title.toLowerCase().includes(query) ||
        proposal.description?.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Impact summary for dashboard
  const impactSummary: ImpactDashboardData = {
    total_items: proposals.reduce((acc, p) => acc + ((p as any).items?.length || 0), 0),
    items_by_type: {
      create: filteredProposals.filter(p => p.status === 'draft').length,
      update: filteredProposals.filter(p => p.status === 'pending_review').length,
      delete: 0,
    },
    items_by_status: {
      pending: stats.pending,
      approved: stats.approved,
      rejected: proposals.filter(p => p.status === 'rejected').length,
    },
    entities_affected: {
      tasks: proposals.reduce((acc, p) => acc + ((p as any).items?.length || 0), 0),
      projects: proposals.length > 0 ? 1 : 0,
      milestones: 0,
    },
    hours: {
      added: 0,
      removed: 0,
      net: 0,
    },
    workloadShifts: [],
    deadlineImpacts: [],
    resourceConflicts: [],
    riskScore: 0,
  }

  if (isLoading) {
    return (
      <PageShell maxWidth="6xl">
        <PageHeader title="Propuestas" subtitle="Cargando..." />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </PageShell>
    )
  }

  // Detail view
  if (showDetail && selectedProposal) {
    return (
      <PageShell maxWidth="6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a propuestas
          </Button>
        </div>

        <ProposalDetailView
          proposalId={selectedProposal.id}
          onClose={() => setSelectedProposal(null)}
          onMerge={() => handleMerge(selectedProposal.id)}
        />
      </PageShell>
    )
  }

  // List view
  return (
    <PageShell maxWidth="6xl">
      <PageHeader
        title="Propuestas"
        subtitle={`${stats.pending} pendientes de revisión`}
        primaryAction={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2"
            >
              <Mic className="h-4 w-4" />
              Grabar
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Propuesta
            </Button>
          </div>
        }
      />

      {/* Impact Dashboard */}
      <div className="mb-6">
        <ImpactDashboard impact={impactSummary} className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar propuestas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
          <TabsList>
            <TabsTrigger value="all">
              Todas
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                {proposals.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending_review">
              Pendientes
              {stats.pending > 0 && (
                <Badge variant="default" className="ml-1.5 h-5 px-1.5 bg-amber-500">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprobadas
              {stats.approved > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {stats.approved}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="draft">Borradores</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Proposal List */}
      <AnimatePresence mode="wait">
        {filteredProposals.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <EmptyState
              icon={GitBranch}
              title="No hay propuestas"
              description="Crea tu primera propuesta para sugerir cambios al proyecto. Puedes usar voz, texto o subir archivos."
              primaryAction={{
                label: 'Crear Propuesta',
                onClick: () => setIsCreateModalOpen(true),
              }}
              size="lg"
            />
          </motion.div>
        ) : (
          <ProposalList
            proposals={filteredProposals}
            projectId=""
            onSelectProposal={handleSelectProposal}
            isLoading={false}
            emptyStateAction={() => setIsCreateModalOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <CreateProposalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId=""
        onCreated={handleCreateProposal}
      />
    </PageShell>
  )
}
