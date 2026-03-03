/**
 * CRICO Auto-Executor — converts high-confidence suggestions into work items
 * for the delegation engine to pick up.
 *
 * Criteria:
 * - Not dismissed
 * - High severity (critical/high)
 * - Confidence > 0.8
 * - No existing work_item_id in metadata
 * - User has auto-apply enabled for the category (from crico_user_trust)
 */

import { supabaseAdmin } from '@/lib/supabase-server'

export interface AutoExecutionResult {
  created: number
  skipped: number
  errors: string[]
}

export async function processAutoExecutableSuggestions(): Promise<AutoExecutionResult> {
  const result: AutoExecutionResult = { created: 0, skipped: 0, errors: [] }

  try {
    // Fetch high-confidence, non-dismissed suggestions without existing work items
    const { data: suggestions, error: fetchError } = await supabaseAdmin
      .from('crico_project_suggestions')
      .select('id, project_id, category, title, description, severity, confidence, metadata')
      .in('severity', ['critical', 'high'])
      .gt('confidence', 0.8)
      .eq('dismissed', false)
      .is('metadata->work_item_id', null)
      .limit(10)
      .order('confidence', { ascending: false })

    if (fetchError || !suggestions || suggestions.length === 0) {
      return result
    }

    // Fetch user trust settings to check auto-apply categories
    const { data: trustSettings } = await supabaseAdmin
      .from('crico_user_trust')
      .select('category, auto_apply')
      .eq('auto_apply', true)

    const autoApplyCategories = new Set(
      (trustSettings ?? []).map((t: { category: string }) => t.category)
    )

    for (const suggestion of suggestions) {
      // Check if auto-apply is enabled for this category
      if (!autoApplyCategories.has(suggestion.category)) {
        result.skipped++
        continue
      }

      // Create a work item with delegation_status='pending'
      const { data: workItem, error: insertError } = await supabaseAdmin
        .from('work_items')
        .insert({
          title: suggestion.title,
          description: suggestion.description ?? `Auto-created from CRICO suggestion: ${suggestion.title}`,
          project_id: suggestion.project_id,
          priority: suggestion.severity === 'critical' ? 'urgent' : 'high',
          delegation_status: 'pending',
          approval_required: false,
          source: 'crico_auto',
        })
        .select('id')
        .single()

      if (insertError || !workItem) {
        result.errors.push(`Failed to create work item for suggestion ${suggestion.id}: ${insertError?.message}`)
        continue
      }

      // Stamp the suggestion with the work_item_id
      await supabaseAdmin
        .from('crico_project_suggestions')
        .update({
          metadata: {
            ...(suggestion.metadata as Record<string, unknown> ?? {}),
            work_item_id: workItem.id,
            auto_executed_at: new Date().toISOString(),
          },
        })
        .eq('id', suggestion.id)

      result.created++
    }
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }

  return result
}
