import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  authRequiredResponse,
  notFoundResponse,
  databaseErrorResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/proposals/[id]/process - Process source content with AI
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params
    const body = await req.json().catch(() => ({}))

    const options = {
      enable_auto_assignment: body.options?.enable_auto_assignment ?? true,
      enable_time_estimation: body.options?.enable_time_estimation ?? true,
      enable_dependency_detection:
        body.options?.enable_dependency_detection ?? true,
    }

    // Verify proposal exists and user has access
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('id, workspace_id, project_id, created_by, status, source_content')
      .eq('id', id)
      .maybeSingle()

    if (proposalError) {
      console.error('Proposal fetch error:', proposalError)
      return databaseErrorResponse('Failed to fetch proposal', proposalError)
    }

    if (!proposal) {
      return notFoundResponse('Proposal', id)
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', proposal.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this proposal')
    }

    // Check permissions: only creator or admins can process
    const isCreator = proposal.created_by === user.id
    const isAdmin = ['owner', 'admin'].includes(membership.role)

    if (!isCreator && !isAdmin) {
      return forbiddenResponse('Only the creator or admins can process proposals')
    }

    // Only process draft proposals
    if (proposal.status !== 'draft') {
      return badRequestResponse(
        'Can only process draft proposals. This proposal has already been submitted.'
      )
    }

    // Use provided source_content or existing
    const sourceContent = body.source_content || proposal.source_content

    if (!sourceContent || Object.keys(sourceContent).length === 0) {
      return badRequestResponse(
        'No source content to process. Please provide source_content.'
      )
    }

    // TODO: Integrate with OpenAI or other AI service to parse source content
    // For now, this is a placeholder implementation
    const processingStartTime = Date.now()

    // Simulate AI processing (replace with actual AI integration)
    const aiAnalysis = {
      detected_tasks: 0,
      confidence: 'medium' as const,
      processing_time_ms: Date.now() - processingStartTime,
      source_type: sourceContent.type || 'text',
      parsed_successfully: true,
    }

    // Parse source content (placeholder - implement actual AI parsing)
    const parsedItems: any[] = []

    // Example: If source content has text, parse it
    if (sourceContent.text) {
      // This is a very basic placeholder
      // In production, this would call OpenAI API to parse the text
      const lines = sourceContent.text.split('\n').filter((l: string) => l.trim())

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line) {
          parsedItems.push({
            action: 'add' as const,
            entity_type: 'task' as const,
            entity_id: null,
            original_state: null,
            proposed_state: {
              title: line,
              description: null,
              status: 'todo',
              priority: 'medium',
            },
            ai_estimate: options.enable_time_estimation
              ? {
                  hours: 4,
                  confidence: 'low',
                  reasoning: 'Default estimate - no historical data available',
                  basis: 'ai_inference',
                }
              : {},
            ai_assignment: options.enable_auto_assignment
              ? {
                  assignee_id: null,
                  confidence: 0,
                  reasoning: 'No assignment data available',
                  alternatives: [],
                }
              : {},
            approval_status: 'pending',
            position: i,
          })
        }
      }

      aiAnalysis.detected_tasks = parsedItems.length
    }

    // Delete existing items before creating new ones
    await supabaseAdmin
      .from('proposal_items')
      .delete()
      .eq('proposal_id', id)

    // Insert parsed items
    if (parsedItems.length > 0) {
      const itemsToInsert = parsedItems.map((item) => ({
        proposal_id: id,
        ...item,
      }))

      const { error: insertError } = await supabaseAdmin
        .from('proposal_items')
        .insert(itemsToInsert)

      if (insertError) {
        console.error('Items insert error:', insertError)
        return databaseErrorResponse(
          'Failed to create proposal items',
          insertError
        )
      }
    }

    // Update proposal with AI analysis
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({
        ai_analysis: aiAnalysis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
        *,
        created_by_user:created_by(id, full_name, email),
        approver:approver_id(id, full_name, email),
        project:project_id(id, name, slug, color),
        items:proposal_items(*)
      `
      )
      .single()

    if (updateError) {
      console.error('Proposal update error:', updateError)
      return databaseErrorResponse('Failed to update proposal', updateError)
    }

    return mergeAuthResponse(
      successResponse({
        proposal: updated,
        processing: {
          items_created: parsedItems.length,
          analysis: aiAnalysis,
          options,
        },
      }),
      authResponse
    )
  } catch (err: any) {
    console.error('Proposal process error:', err)
    return databaseErrorResponse('Failed to process proposal', err)
  }
}
