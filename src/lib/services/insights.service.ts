/**
 * AI Insights Service
 *
 * Replaces traditional analytics dashboards with contextual AI-powered insights
 * Provides actionable intelligence instead of raw metrics
 *
 * Features:
 * - Team velocity analysis and predictions
 * - Project completion forecasts
 * - Blocker detection and resolution suggestions
 * - Workload balance recommendations
 * - Contextual insights based on time of day, week, project phase
 *
 * Part of Foco's Phase 2: Simplified Mode - Replace Analytics with AI Insights
 */

import { aiService } from './openai'
import { supabase as supabaseClient } from '@/lib/supabase-client'

const untypedSupabase = supabaseClient as any

export type InsightType =
  | 'velocity'          // Team velocity trends
  | 'forecast'          // Project completion predictions
  | 'blocker'           // Detected blockers
  | 'workload'          // Team workload balance
  | 'recommendation'    // Contextual recommendations

export type InsightSeverity = 'info' | 'success' | 'warning' | 'critical'

export interface Insight {
  id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  data?: {
    metric?: string
    value?: number
    change?: number
    trend?: 'up' | 'down' | 'stable'
    prediction?: string
    affected_items?: Array<{ id: string; title: string }>
  }
  actions?: Array<{
    label: string
    action: string
    href?: string
  }>
  generated_at: string
  confidence: number
}

export interface InsightsResponse {
  greeting: string
  primary_insight: Insight | null
  secondary_insights: Insight[]
  total_insights: number
  generated_at: string
}

export class InsightsService {
  private supabase = untypedSupabase

  /**
   * Generate contextual AI insights for user
   */
  async getInsights(userId: string, workspaceId?: string): Promise<InsightsResponse> {
    try {
      // 1. Gather context data
      const context = await this.gatherContext(userId, workspaceId)

      // 2. Generate AI insights
      const insights = await this.generateAIInsights(context)

      // 3. Prioritize and categorize
      const prioritized = this.prioritizeInsights(insights)

      return {
        greeting: this.getContextualGreeting(),
        primary_insight: prioritized[0] || null,
        secondary_insights: prioritized.slice(1, 4),
        total_insights: insights.length,
        generated_at: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error('Failed to generate insights:', error)
      // Return fallback insights
      return this.getFallbackInsights()
    }
  }

  /**
   * Gather context data for insight generation
   */
  private async gatherContext(userId: string, workspaceId?: string) {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Fetch tasks
    const { data: recentTasks } = await this.supabase
      .from('work_items')
      .select('id, title, status, priority, created_at, updated_at, due_date, assignee_id')
      .or(`assignee_id.eq.${userId},reporter_id.eq.${userId}`)
      .gte('created_at', twoWeeksAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    // Fetch projects
    const { data: activeProjects } = await this.supabase
      .from('foco_projects')
      .select('id, title, status, created_at, updated_at, due_date')
      .in('status', ['active', 'planning'])
      .order('created_at', { ascending: false })
      .limit(20)

    // Calculate completion metrics
    const completedThisWeek = recentTasks?.filter(
      t => t.status === 'done' && new Date(t.updated_at) >= oneWeekAgo
    ).length || 0

    const completedLastWeek = recentTasks?.filter(
      t => t.status === 'done' &&
      new Date(t.updated_at) >= twoWeeksAgo &&
      new Date(t.updated_at) < oneWeekAgo
    ).length || 0

    const blockedTasks = recentTasks?.filter(t => t.status === 'blocked') || []
    const overdueTasks = recentTasks?.filter(
      t => t.due_date && new Date(t.due_date) < now && t.status !== 'done'
    ) || []

    const inProgressTasks = recentTasks?.filter(t => t.status === 'in_progress') || []

    return {
      userId,
      workspaceId,
      timeContext: {
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
      },
      metrics: {
        completedThisWeek,
        completedLastWeek,
        velocityChange: completedThisWeek - completedLastWeek,
        blockedCount: blockedTasks.length,
        overdueCount: overdueTasks.length,
        inProgressCount: inProgressTasks.length,
        activeProjectsCount: activeProjects?.length || 0,
      },
      tasks: {
        blocked: blockedTasks,
        overdue: overdueTasks,
        inProgress: inProgressTasks,
        recent: recentTasks || [],
      },
      projects: activeProjects || [],
    }
  }

  /**
   * Generate AI insights using OpenAI
   */
  private async generateAIInsights(context: any): Promise<Insight[]> {
    const insights: Insight[] = []

    try {
      const prompt = `You are an AI project management analyst. Analyze this data and provide 3-5 actionable insights.

Context:
- Time: ${context.timeContext.hour}:00 (${context.timeContext.isWeekend ? 'Weekend' : 'Weekday'})
- Tasks completed this week: ${context.metrics.completedThisWeek}
- Tasks completed last week: ${context.metrics.completedLastWeek}
- Velocity change: ${context.metrics.velocityChange > 0 ? '+' : ''}${context.metrics.velocityChange}
- Blocked tasks: ${context.metrics.blockedCount}
- Overdue tasks: ${context.metrics.overdueCount}
- In-progress tasks: ${context.metrics.inProgressCount}
- Active projects: ${context.metrics.activeProjectsCount}

Blocked tasks: ${context.tasks.blocked.map((t: any) => t.title).join(', ') || 'None'}
Overdue tasks: ${context.tasks.overdue.map((t: any) => t.title).join(', ') || 'None'}

Generate insights in this JSON format:
[
  {
    "type": "velocity|forecast|blocker|workload|recommendation",
    "severity": "info|success|warning|critical",
    "title": "Short title (5-7 words)",
    "description": "One clear sentence explaining the insight and its impact",
    "confidence": 0.85,
    "data": {
      "metric": "velocity",
      "value": 12,
      "change": 3,
      "trend": "up",
      "prediction": "You'll likely finish the mobile redesign 1 week early"
    }
  }
]

Rules:
- Be specific and actionable
- Focus on what matters NOW
- Predict outcomes when possible
- Detect patterns humans might miss
- Use positive framing when appropriate
- Maximum 5 insights, prioritize by importance`

      const response = await aiService.generate({
        prompt,
        systemPrompt: 'You are an expert project management analyst. Be concise, specific, and actionable.',
        temperature: 0.5,
        maxTokens: 1500,
      })

      const parsed = JSON.parse(response.content)

      return parsed.map((insight: any, index: number) => ({
        id: `insight-${Date.now()}-${index}`,
        type: insight.type || 'recommendation',
        severity: insight.severity || 'info',
        title: insight.title,
        description: insight.description,
        data: insight.data,
        confidence: insight.confidence || 0.8,
        generated_at: new Date().toISOString(),
      }))
    } catch (error) {
      console.error('AI insight generation failed:', error)
      // Return rule-based insights as fallback
      return this.generateRuleBasedInsights(context)
    }
  }

  /**
   * Fallback: Rule-based insights when AI fails
   */
  private generateRuleBasedInsights(context: any): Insight[] {
    const insights: Insight[] = []

    // Velocity insight
    if (context.metrics.velocityChange !== 0) {
      insights.push({
        id: `insight-velocity-${Date.now()}`,
        type: 'velocity',
        severity: context.metrics.velocityChange > 0 ? 'success' : 'warning',
        title: context.metrics.velocityChange > 0 ? 'Team Velocity Increasing' : 'Team Velocity Declining',
        description: `Your team completed ${Math.abs(context.metrics.velocityChange)} ${Math.abs(context.metrics.velocityChange) === 1 ? 'task' : 'tasks'} ${context.metrics.velocityChange > 0 ? 'more' : 'fewer'} than last week.`,
        data: {
          metric: 'velocity',
          value: context.metrics.completedThisWeek,
          change: context.metrics.velocityChange,
          trend: context.metrics.velocityChange > 0 ? 'up' : 'down',
        },
        confidence: 0.9,
        generated_at: new Date().toISOString(),
      })
    }

    // Blocker detection
    if (context.metrics.blockedCount > 0) {
      insights.push({
        id: `insight-blocker-${Date.now()}`,
        type: 'blocker',
        severity: context.metrics.blockedCount > 2 ? 'critical' : 'warning',
        title: `${context.metrics.blockedCount} ${context.metrics.blockedCount === 1 ? 'Task' : 'Tasks'} Blocked`,
        description: `${context.metrics.blockedCount} ${context.metrics.blockedCount === 1 ? 'task is' : 'tasks are'} currently blocked and need attention to unblock the team.`,
        data: {
          affected_items: context.tasks.blocked.slice(0, 3).map((t: any) => ({
            id: t.id,
            title: t.title,
          })),
        },
        actions: [
          {
            label: 'Review Blockers',
            action: 'view_blockers',
            href: '/tasks?filter=blocked',
          },
        ],
        confidence: 1.0,
        generated_at: new Date().toISOString(),
      })
    }

    // Overdue tasks warning
    if (context.metrics.overdueCount > 0) {
      insights.push({
        id: `insight-overdue-${Date.now()}`,
        type: 'recommendation',
        severity: context.metrics.overdueCount > 3 ? 'critical' : 'warning',
        title: `${context.metrics.overdueCount} Overdue ${context.metrics.overdueCount === 1 ? 'Task' : 'Tasks'}`,
        description: `${context.metrics.overdueCount} ${context.metrics.overdueCount === 1 ? 'task has' : 'tasks have'} missed their deadline and need rescheduling or completion.`,
        data: {
          affected_items: context.tasks.overdue.slice(0, 3).map((t: any) => ({
            id: t.id,
            title: t.title,
          })),
        },
        actions: [
          {
            label: 'View Overdue',
            action: 'view_overdue',
            href: '/tasks?filter=overdue',
          },
        ],
        confidence: 1.0,
        generated_at: new Date().toISOString(),
      })
    }

    // Workload insight
    if (context.metrics.inProgressCount > 10) {
      insights.push({
        id: `insight-workload-${Date.now()}`,
        type: 'workload',
        severity: 'warning',
        title: 'High Work-in-Progress',
        description: `${context.metrics.inProgressCount} tasks are currently in progress. Consider focusing on completion before starting new work.`,
        data: {
          metric: 'wip',
          value: context.metrics.inProgressCount,
        },
        actions: [
          {
            label: 'View In Progress',
            action: 'view_in_progress',
            href: '/tasks?filter=in_progress',
          },
        ],
        confidence: 0.85,
        generated_at: new Date().toISOString(),
      })
    }

    // On track insight (positive)
    if (
      context.metrics.velocityChange >= 0 &&
      context.metrics.blockedCount === 0 &&
      context.metrics.overdueCount === 0
    ) {
      insights.push({
        id: `insight-ontrack-${Date.now()}`,
        type: 'forecast',
        severity: 'success',
        title: 'On Track',
        description: 'Your team is on track with steady velocity and no blockers.',
        data: {
          trend: 'stable',
        },
        confidence: 0.9,
        generated_at: new Date().toISOString(),
      })
    }

    return insights
  }

  /**
   * Prioritize insights by severity and importance
   */
  private prioritizeInsights(insights: Insight[]): Insight[] {
    const severityWeight = {
      critical: 4,
      warning: 3,
      success: 2,
      info: 1,
    }

    return insights.sort((a, b) => {
      // First by severity
      const severityDiff = severityWeight[b.severity] - severityWeight[a.severity]
      if (severityDiff !== 0) return severityDiff

      // Then by confidence
      return (b.confidence || 0) - (a.confidence || 0)
    })
  }

  /**
   * Get contextual greeting based on time of day
   */
  private getContextualGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  /**
   * Fallback insights when everything fails
   */
  private getFallbackInsights(): InsightsResponse {
    return {
      greeting: this.getContextualGreeting(),
      primary_insight: {
        id: 'fallback-1',
        type: 'recommendation',
        severity: 'info',
        title: 'Ready to Go',
        description: 'Your workspace is ready. Start by reviewing your inbox or creating a new task.',
        confidence: 0.7,
        generated_at: new Date().toISOString(),
      },
      secondary_insights: [],
      total_insights: 1,
      generated_at: new Date().toISOString(),
    }
  }
}

export const insightsService = new InsightsService()
