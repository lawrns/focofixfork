import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)
    
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Try to find by ID first, then by slug
    let { data, error: queryError } = await supabase
      .from('foco_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (queryError) {
      // Try by slug
      const { data: slugData, error: slugError } = await supabase
        .from('foco_projects')
        .select('*')
        .eq('slug', id)
        .single()

      if (slugError) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }
      data = slugData
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Project GET error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)
    
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.slug !== undefined) updateData.slug = body.slug
    if (body.description !== undefined) updateData.description = body.description
    if (body.color !== undefined) updateData.color = body.color
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.status !== undefined) updateData.status = body.status
    if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned
    if (body.archived_at !== undefined) updateData.archived_at = body.archived_at

    updateData.updated_at = new Date().toISOString()

    const { data, error: updateError } = await supabase
      .from('foco_projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Project update error:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Project PATCH error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)
    
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error: deleteError } = await supabase
      .from('foco_projects')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Project delete error:', deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (err: any) {
    console.error('Project DELETE error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
