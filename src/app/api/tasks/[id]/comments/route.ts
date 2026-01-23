import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  authRequiredResponse,
  taskNotFoundResponse,
  internalErrorResponse,
  databaseErrorResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: taskId } = await params

    // Verify task exists and user has access
    const { data: task } = await supabaseAdmin
      .from('work_items')
      .select('id, workspace_id')
      .eq('id', taskId)
      .maybeSingle()

    if (!task) {
      return taskNotFoundResponse(taskId)
    }

    // Verify user has access to this task's workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this task')
    }

    // Fetch comments with user info
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select(`
        id,
        work_item_id,
        user_id,
        content,
        mentions,
        attachments,
        is_ai_generated,
        ai_sources,
        created_at,
        updated_at
      `)
      .eq('work_item_id', taskId)
      .order('created_at', { ascending: true })

    if (commentsError) {
      const errorRes = databaseErrorResponse('Failed to fetch comments', commentsError)
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Define types
    interface UserProfile { id: string; full_name: string; email: string }
    interface Comment {
      id: string
      work_item_id: string
      user_id: string
      content: string
      mentions: string[] | null
      attachments: unknown[] | null
      is_ai_generated: boolean
      ai_sources: unknown[] | null
      created_at: string
      updated_at: string
    }

    // Fetch user profiles for comments
    const typedComments = (comments || []) as Comment[]
    const userIds = [...new Set(typedComments.map(c => c.user_id).filter(Boolean))]
    let userProfiles: Record<string, UserProfile> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (profiles) {
        userProfiles = profiles.reduce((acc: Record<string, UserProfile>, p: UserProfile) => ({ ...acc, [p.id]: p }), {})
      }
    }

    // Attach user info to comments
    const commentsWithUsers = typedComments.map(comment => ({
      ...comment,
      user: userProfiles[comment.user_id] || null
    }))

    return mergeAuthResponse(successResponse(commentsWithUsers), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return internalErrorResponse('Failed to fetch comments', message)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: taskId } = await params
    const body = await req.json()

    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return badRequestResponse('Comment content is required')
    }

    // Verify task exists and user has access
    const { data: task } = await supabaseAdmin
      .from('work_items')
      .select('id, workspace_id')
      .eq('id', taskId)
      .maybeSingle()

    if (!task) {
      return taskNotFoundResponse(taskId)
    }

    // Verify user has access to this task's workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this task')
    }

    // Extract mentions from content (pattern: @[name](user_id))
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(body.content)) !== null) {
      mentions.push(match[2])
    }

    // Create comment
    const { data: comment, error: createError } = await supabaseAdmin
      .from('comments')
      .insert({
        work_item_id: taskId,
        user_id: user.id,
        content: body.content.trim(),
        mentions,
        attachments: body.attachments || [],
        is_ai_generated: false
      })
      .select()
      .single()

    if (createError) {
      const errorRes = databaseErrorResponse('Failed to create comment', createError)
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Get user profile for response
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    return mergeAuthResponse(successResponse({
      ...comment,
      user: userProfile
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return internalErrorResponse('Failed to create comment', message)
  }
}
