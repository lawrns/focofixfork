import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
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
      return databaseErrorResponse('Failed to fetch comments', commentsError)
    }

    // Fetch user profiles for comments
    const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))]
    let userProfiles: Record<string, any> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (profiles) {
        userProfiles = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
      }
    }

    // Attach user info to comments
    const commentsWithUsers = comments.map(comment => ({
      ...comment,
      user: userProfiles[comment.user_id] || null
    }))

    return successResponse(commentsWithUsers)
  } catch (err: any) {
    console.error('Comments GET error:', err)
    return internalErrorResponse('Failed to fetch comments', err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
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
      return databaseErrorResponse('Failed to create comment', createError)
    }

    // Get user profile for response
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    return successResponse({
      ...comment,
      user: userProfile
    })
  } catch (err: any) {
    console.error('Comment POST error:', err)
    return internalErrorResponse('Failed to create comment', err)
  }
}
