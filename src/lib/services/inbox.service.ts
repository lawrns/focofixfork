/**
 * Smart Inbox Service
 *
 * AI-powered priority queue that replaces notification chaos
 * Surfaces only what needs attention RIGHT NOW
 *
 * Phase 2: Simplified Mode - The #1 Essential Tool
 */

import { aiService } from './openai'
import { supabase as supabaseClient } from '@/lib/supabase-client'

const untypedSupabase = supabaseClient as any

export interface InboxItem {
  id: string
  type: 'task' | 'project' | 'comment' | 'mention'
  title: string
  description: string
  urgency_score: number // 0-100, AI-computed
  category: 'critical' | 'today' | 'this_week' | 'later'
  context: {
    age_hours: number
    is_blocker: boolean
    waiting_on_user: boolean
    mentions_user: boolean
    due_soon: boolean
    team_blocked: boolean
  }
  actions: Array<{
    label: string
    action: string
    data?: any
  }>
  created_at: string
  updated_at: string
}

export interface SmartInboxResponse {
  greeting: string
  critical: InboxItem[]
  today: InboxItem[]
  this_week: InboxItem[]
  later_count: number
  total_count: number
  generated_at: string
}

export class InboxService {
  private supabase = untypedSupabase

  /**
   * Get AI-curated Smart Inbox
   * Returns only top 5-10 priority items
   */
  async getSmartInbox(userId: string): Promise<SmartInboxResponse> {
    try {
      // 1. Fetch user's tasks, comments, mentions
      const rawItems = await this.fetchUserItems(userId)

      // 2. AI prioritization
      const prioritized = await this.prioritizeWithAI(rawItems, userId)

      // 3. Categorize
      const categorized = this.categorizeItems(prioritized)

      // 4. Generate contextual greeting
      const greeting = this.generateGreeting()

      return {
        greeting,
        critical: categorized.filter(item => item.category === 'critical').slice(0, 5),
        today: categorized.filter(item => item.category === 'today').slice(0, 5),
        this_week: categorized.filter(item => item.category === 'this_week').slice(0, 5),
        later_count: categorized.filter(item => item.category === 'later').length,
        total_count: rawItems.length,
        generated_at: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error('Smart Inbox error:', error)
      throw new Error(`Failed to generate Smart Inbox: ${error.message}`)
    }
  }

  /**
   * Fetch all items that might need user attention
   */
  private async fetchUserItems(userId: string): Promise<any[]> {
    const { data: tasks } = await this.supabase
      .from('work_items')
      .select(`
        *,
        project:projects(title),
        assignee:users(full_name)
      `)
      .or(`assignee_id.eq.${userId},reporter_id.eq.${userId}`)
      .in('status', ['todo', 'in_progress', 'blocked'])
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: comments } = await this.supabase
      .from('comments')
      .select(`
        *,
        work_item:work_items(title, project_id),
        author:profiles(full_name)
      `)
      .or(`mentions.cs.{${userId}},user_id.eq.${userId}`)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    return [
      ...(tasks || []).map(t => ({ ...t, type: 'task' })),
      ...(comments || []).map(c => ({ ...c, type: 'comment', work_item: c.work_item || { title: 'Unknown', project_id: null } })),
    ]
  }

  /**
   * AI prioritization using OpenAI GPT-4
   * Analyzes context and assigns urgency scores
   */
  private async prioritizeWithAI(items: any[], userId: string): Promise<InboxItem[]> {
    if (items.length === 0) return []

    const prompt = `You are an AI assistant analyzing a user's work inbox. Prioritize items by urgency.

User has ${items.length} items. Analyze each and assign urgency score (0-100):

Factors that INCREASE urgency:
- Overdue or due soon
- Blocking teammates (mentions, assignments)
- Marked as blocked/high priority
- Old items with no progress
- Direct mentions of the user

Factors that DECREASE urgency:
- No deadline
- Low priority
- Already in progress with recent activity
- Optional/nice-to-have

Items:
${items.slice(0, 20).map((item, i) => `
${i + 1}. ${item.title || 'Untitled'}
   Type: ${item.type}
   Status: ${item.status || 'N/A'}
   Due: ${item.due_date || 'No deadline'}
   Age: ${this.getAgeHours(item.created_at)}h old
   Priority: ${item.priority || 'medium'}
`).join('\n')}

Return JSON array:
[
  {
    "index": 0,
    "urgency_score": 85,
    "category": "critical",
    "reasoning": "Overdue task blocking Sarah",
    "suggested_actions": ["Review", "Delegate"]
  }
]

Categories: "critical" (90-100), "today" (70-89), "this_week" (50-69), "later" (<50)`

    try {
      const response = await aiService.generate({
        prompt,
        systemPrompt: 'You are an expert at prioritizing work. Be decisive and actionable.',
        temperature: 0.4,
        maxTokens: 2000,
      })

      let prioritized = JSON.parse(response.content)

      // Map AI results back to items
      return items.map((item, index) => {
        const aiResult = prioritized.find((p: any) => p.index === index) || {
          urgency_score: 50,
          category: 'later',
          reasoning: 'Default priority',
          suggested_actions: ['View'],
        }

        return {
          id: item.id,
          type: item.type,
          title: item.title || item.content?.substring(0, 50),
          description: aiResult.reasoning,
          urgency_score: aiResult.urgency_score,
          category: aiResult.category,
          context: {
            age_hours: this.getAgeHours(item.created_at),
            is_blocker: item.status === 'blocked',
            waiting_on_user: false, // TODO: detect from comments
            mentions_user: item.type === 'comment',
            due_soon: this.isDueSoon(item.due_date),
            team_blocked: aiResult.reasoning.toLowerCase().includes('blocking'),
          },
          actions: aiResult.suggested_actions.map((label: string) => ({
            label,
            action: label.toLowerCase().replace(' ', '_'),
            data: { item_id: item.id },
          })),
          created_at: item.created_at,
          updated_at: item.updated_at || item.created_at,
        }
      })
    } catch (error) {
      console.error('AI prioritization failed, using fallback:', error)
      return this.fallbackPrioritization(items)
    }
  }

  /**
   * Fallback prioritization (rule-based)
   */
  private fallbackPrioritization(items: any[]): InboxItem[] {
    return items.map(item => {
      let score = 50
      const ageHours = this.getAgeHours(item.created_at)

      // Scoring rules
      if (item.status === 'blocked') score += 30
      if (item.priority === 'high' || item.priority === 'critical') score += 25
      if (this.isDueSoon(item.due_date)) score += 20
      if (ageHours > 48) score += 15
      if (item.type === 'comment') score += 10

      const category =
        score >= 90 ? 'critical' :
        score >= 70 ? 'today' :
        score >= 50 ? 'this_week' : 'later'

      return {
        id: item.id,
        type: item.type,
        title: item.title || 'Untitled',
        description: `${item.type} • ${ageHours}h old`,
        urgency_score: Math.min(score, 100),
        category,
        context: {
          age_hours: ageHours,
          is_blocker: item.status === 'blocked',
          waiting_on_user: false,
          mentions_user: item.type === 'comment',
          due_soon: this.isDueSoon(item.due_date),
          team_blocked: false,
        },
        actions: [
          { label: 'View', action: 'view', data: { item_id: item.id } }
        ],
        created_at: item.created_at,
        updated_at: item.updated_at || item.created_at,
      }
    })
  }

  private categorizeItems(items: InboxItem[]): InboxItem[] {
    return items.sort((a, b) => b.urgency_score - a.urgency_score)
  }

  private generateGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  private getAgeHours(created_at: string): number {
    return Math.floor((Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60))
  }

  private isDueSoon(due_date?: string | null): boolean {
    if (!due_date) return false
    const hoursUntilDue = (new Date(due_date).getTime() - Date.now()) / (1000 * 60 * 60)
    return hoursUntilDue < 24 && hoursUntilDue > 0
  }
}

export const inboxService = new InboxService()
