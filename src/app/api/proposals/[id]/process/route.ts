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
import { aiProposalParser } from '@/lib/services/ai-proposal-parser'

export const dynamic = 'force-dynamic'

/**
 * POST /api/proposals/[id]/process - Process source content with AI
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params
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
      .select('id, workspace_id, project_id, created_by, status, source_content, title, description')
      .eq('id', id)
      .maybeSingle()

    if (proposalError) {
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

    const processingStartTime = Date.now()
    let parsedItems: any[] = []
    let aiAnalysis: any = {
      detected_tasks: 0,
      confidence: 'medium' as const,
      processing_time_ms: 0,
      source_type: sourceContent.type || 'text',
      parsed_successfully: false,
    }

    // Get project context if available
    let projectContext = undefined
    if (proposal.project_id) {
      const { data: project } = await supabaseAdmin
        .from('foco_projects')
        .select('id, name, description')
        .eq('id', proposal.project_id)
        .maybeSingle()

      if (project) {
        projectContext = {
          id: project.id,
          name: project.name,
          description: project.description,
        }
      }
    }

    // Try to use AI parser, fall back to basic parsing if no API key
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY

    if (hasOpenAIKey && sourceContent.text) {
      try {
        // Use AI-powered parsing
        const parsedProposal = await aiProposalParser.parseProposalInput(
          sourceContent.text,
          projectContext
        )

        // Convert parsed items to database format
        parsedItems = parsedProposal.items.map((item, index) => ({
          action: 'add' as const,
          entity_type: item.type === 'milestone' ? 'milestone' : 'task',
          entity_id: null,
          original_state: null,
          proposed_state: {
            title: item.title,
            description: item.description || null,
            status: item.status || 'backlog',
            priority: item.priority || 'medium',
            type: item.itemType || 'task',
          },
          ai_estimate: options.enable_time_estimation && item.estimatedHours
            ? {
                hours: item.estimatedHours,
                confidence: parsedProposal.confidence,
                reasoning: `AI-estimated based on task complexity and requirements`,
                basis: 'ai_inference',
              }
            : {},
          ai_assignment: options.enable_auto_assignment && item.assigneeId
            ? {
                assignee_id: item.assigneeId,
                confidence: parsedProposal.confidence,
                reasoning: 'AI-suggested based on task requirements',
                alternatives: [],
              }
            : {},
          approval_status: 'pending',
          position: index,
        }))

        aiAnalysis = {
          detected_tasks: parsedItems.length,
          confidence: parsedProposal.confidence >= 0.8 ? 'high' : parsedProposal.confidence >= 0.5 ? 'medium' : 'low',
          processing_time_ms: Date.now() - processingStartTime,
          source_type: sourceContent.type || 'text',
          parsed_successfully: true,
          summary: parsedProposal.summary,
          total_estimated_hours: parsedProposal.totalEstimatedHours,
          risks: parsedProposal.risks,
          assumptions: parsedProposal.assumptions,
        }
      } catch {
        // AI parsing failed, fall through to basic parsing
      }
    }

    // Basic fallback parsing (when AI is unavailable or fails)
    if (parsedItems.length === 0 && sourceContent.text) {
      const lines = sourceContent.text.split('\n').filter((l: string) => l.trim())

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line && line.length > 3) { // Skip very short lines
          parsedItems.push({
            action: 'add' as const,
            entity_type: 'task' as const,
            entity_id: null,
            original_state: null,
            proposed_state: {
              title: line.slice(0, 200), // Limit title length
              description: null,
              status: 'backlog',
              priority: 'medium',
            },
            ai_estimate: options.enable_time_estimation
              ? {
                  hours: 4,
                  confidence: 0.3,
                  reasoning: 'Default estimate - AI parsing unavailable',
                  basis: 'default',
                }
              : {},
            ai_assignment: {},
            approval_status: 'pending',
            position: i,
          })
        }
      }

      aiAnalysis = {
        detected_tasks: parsedItems.length,
        confidence: 'low' as const,
        processing_time_ms: Date.now() - processingStartTime,
        source_type: sourceContent.type || 'text',
        parsed_successfully: true,
        fallback_used: true,
        note: hasOpenAIKey ? 'AI parsing failed, used basic fallback' : 'OPENAI_API_KEY not configured, used basic parsing',
      }
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
        return databaseErrorResponse(
          'Failed to create proposal items',
          insertError
        )
      }
    }

    // Update proposal with AI analysis and source content
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({
        ai_analysis: aiAnalysis,
        source_content: sourceContent,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to process proposal', message)
  }
}
