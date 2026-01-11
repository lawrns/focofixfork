import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const isRead = searchParams.get('is_read');
    const isResolved = searchParams.get('is_resolved');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('inbox_items')
      .select(`
        *,
        work_item:work_items(id, title, status, priority),
        project:foco_projects(id, name, color)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true');
    }

    if (isResolved !== null) {
      query = query.eq('is_resolved', isResolved === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch inbox items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspace_id,
      user_id,
      type,
      title,
      body: itemBody,
      source_type,
      source_id,
      work_item_id,
      project_id,
      actor_id,
      metadata,
    } = body;

    if (!workspace_id || !user_id || !type || !title) {
      return NextResponse.json(
        { error: 'workspace_id, user_id, type, and title are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('inbox_items')
      .insert({
        workspace_id,
        user_id,
        type,
        title,
        body: itemBody,
        source_type,
        source_id,
        work_item_id,
        project_id,
        actor_id,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create inbox item' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_read, is_resolved, snoozed_until } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Inbox item id is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};
    if (is_read !== undefined) updates.is_read = is_read;
    if (is_resolved !== undefined) updates.is_resolved = is_resolved;
    if (snoozed_until !== undefined) updates.snoozed_until = snoozed_until;

    const { data, error } = await supabase
      .from('inbox_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update inbox item' }, { status: 500 });
  }
}

// Bulk mark as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, is_read } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('inbox_items')
      .update({ is_read: is_read ?? true })
      .in('id', ids)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to bulk update inbox items' }, { status: 500 });
  }
}
