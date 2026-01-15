'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  User,
  Flag,
  Edit,
  Trash2,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { MilestonesService } from '@/lib/services/milestones'
import type { MilestoneStatus } from '@/lib/models/milestones'
import { ProtectedRoute } from '@/components/auth/protected-route'

interface Milestone {
  id: string
  project_id: string
  name: string
  description: string | null
  status: string
  priority: string
  deadline: string | null
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface Comment {
  id: string
  milestone_id: string
  user_id: string
  content: string
  created_at: string
  user_name?: string
}

export default function MilestonePage() {
  return (
    <ProtectedRoute>
      <MilestonePageContent />
    </ProtectedRoute>
  )
}

function MilestonePageContent() {
  const params = useParams()
  const milestoneId = params.id as string
  const { user } = useAuth()

  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [project, setProject] = useState<{ slug: string } | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')

  const loadMilestoneData = useCallback(async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/milestones/${milestoneId}`)
      if (!response.ok) {
        throw new Error('Failed to load milestone')
      }
      const milestoneResult = await response.json()
      if (!milestoneResult.success) {
        setError(milestoneResult.error || 'Failed to load milestone')
        return
      }
      setMilestone(milestoneResult.data!)

      // Load project data for navigation
      if (milestoneResult.data?.project_id) {
        const projectRes = await fetch(`/api/projects?id=${milestoneResult.data.project_id}`)
        const projectData = await projectRes.json()
        if (projectData.success && projectData.data?.slug) {
          setProject({ slug: projectData.data.slug })
        }
      }

      // Load comments (placeholder - implement when service is ready)
      setComments([])
    } catch (err) {
      setError('Failed to load milestone data')
      console.error('Milestone load error:', err)
    } finally {
      setLoading(false)
    }
  }, [milestoneId])

  useEffect(() => {
    loadMilestoneData()
  }, [milestoneId, loadMilestoneData])

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/40',
          label: 'Completed'
        }
      case 'in-progress':
        return {
          icon: Clock,
          color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/40',
          label: 'In Progress'
        }
      case 'review':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/40',
          label: 'Review'
        }
      case 'planning':
        return {
          icon: Flag,
          color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/40',
          label: 'Planning'
        }
      case 'cancelled':
        return {
          icon: Trash2,
          color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40',
          label: 'Cancelled'
        }
      default:
        return {
          icon: Flag,
          color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/40',
          label: status
        }
    }
  }

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { color: 'text-red-600', label: 'Critical', icon: '🔴' }
      case 'high':
        return { color: 'text-orange-600', label: 'High', icon: '🟠' }
      case 'medium':
        return { color: 'text-yellow-600', label: 'Medium', icon: '🟡' }
      case 'low':
        return { color: 'text-green-600', label: 'Low', icon: '🟢' }
      default:
        return { color: 'text-gray-600', label: priority, icon: '⚪' }
    }
  }

  const handleStatusChange = async (newStatus: MilestoneStatus) => {
    if (!milestone) return

    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (!response.ok) {
        throw new Error('Failed to update milestone status')
      }
      const result = await response.json()
      if (result.success) {
        setMilestone(result.data!)
      }
    } catch (err) {
      console.error('Status update error:', err)
    }
  }

  const handleDeleteMilestone = async () => {
    if (!milestone || !user) return

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${milestone.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete milestone')
      }

      const result = await response.json()
      if (result.success) {
        // Fetch project to get slug
        const projectRes = await fetch(`/api/projects?id=${milestone.project_id}`)
        const projectData = await projectRes.json()
        if (projectData.success && projectData.data?.slug) {
          window.location.href = `/projects/${projectData.data.slug}`
        } else {
          window.location.href = '/projects'
        }
      } else {
        throw new Error(result.error || 'Failed to delete milestone')
      }
    } catch (err) {
      console.error('Milestone delete error:', err)
      alert('Failed to delete milestone. Please try again.')
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      // Placeholder - implement when comments service is ready
      const comment: Comment = {
        id: Date.now().toString(),
        milestone_id: milestoneId,
        user_id: 'current-user',
        content: newComment,
        created_at: new Date().toISOString(),
        user_name: 'Current User'
      }

      setComments(prev => [...prev, comment])
      setNewComment('')
    } catch (err) {
      console.error('Comment add error:', err)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  if (error || !milestone) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground">{error || 'Milestone not found'}</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  const statusInfo = getStatusInfo(milestone.status)
  const priorityInfo = getPriorityInfo(milestone.priority)

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/projects/${project?.slug || '#'}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Project
              </Button>
            </Link>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{milestone.name}</h1>
              {milestone.description && (
                <p className="text-muted-foreground text-lg">{milestone.description}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" aria-label="Edit milestone">
                <Edit className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDeleteMilestone}
                aria-label="Delete milestone"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Status and Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <statusInfo.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Status</span>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </div>

            <div className="mt-4 space-y-2">
              {['planning', 'in-progress', 'review', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status as MilestoneStatus)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    milestone.status === status
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  aria-label={`Change milestone status to ${getStatusInfo(status).label}`}
                  aria-pressed={milestone.status === status}
                >
                  {getStatusInfo(status).label}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg border p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <Flag className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Priority</span>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${priorityInfo.color}`}>
              <span className="mr-2">{priorityInfo.icon}</span>
              {priorityInfo.label}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg border p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Deadline</span>
            </div>
            {milestone.deadline ? (
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {new Date(milestone.deadline).toLocaleDateString()}
                </p>
                <p className="text-muted-foreground">
                  {new Date(milestone.deadline) < new Date() ? 'Overdue' : 'Upcoming'}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No deadline set</p>
            )}
          </motion.div>
        </div>

        {/* Assignment */}
        {milestone.assigned_to && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Assigned To</span>
            </div>
            <p className="text-foreground">User ID: {milestone.assigned_to}</p>
          </motion.div>
        )}

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-lg border"
        >
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments ({comments.length})
            </h2>
          </div>

          <div className="p-6">
            {/* Add Comment */}
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary/20 bg-background"
                rows={3}
                aria-label="Comment text"
              />
              <div className="flex justify-end mt-3">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  Add Comment
                </Button>
              </div>
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No comments yet. Be the first to add one!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">
                        {comment.user_name || 'Unknown User'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-foreground">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
}
