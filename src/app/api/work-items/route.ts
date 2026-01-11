import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assignee_id');
    const type = searchParams.get('type');

    let query = supabase
      .from('work_items')
      .select(`
        *,
        project:foco_projects(id, name, slug, color)
      `)
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform labels from nested structure
    const transformedData = data?.map(item => ({
      ...item,
      labels: item.labels?.map((l: any) => l.label).filter(Boolean) || [],
    }));

    return NextResponse.json({ data: transformedData });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch work items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspace_id,
      project_id,
      parent_id,
      type,
      title,
      description,
      status,
      priority,
      assignee_id,
      reporter_id,
      due_date,
      start_date,
      estimate_hours,
      label_ids,
    } = body;

    if (!workspace_id || !title) {
      return NextResponse.json(
        { error: 'workspace_id and title are required' },
        { status: 400 }
      );
    }

    // Get max position for ordering
    const posQuery = supabase
      .from('work_items')
      .select('position')
      .eq('workspace_id', workspace_id);
    
    if (project_id) {
      posQuery.eq('project_id', project_id);
    }

    const { data: maxPos } = await posQuery
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = maxPos ? maxPos.position + 1 : 0;

    const { data, error } = await supabase
      .from('work_items')
      .insert({
        workspace_id,
        project_id,
        parent_id,
        type: type || 'task',
        title,
        description,
        status: status || 'backlog',
        priority: priority || 'medium',
        assignee_id,
        reporter_id,
        due_date,
        start_date,
        estimate_hours,
        position,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add labels if provided
    if (label_ids && label_ids.length > 0 && data) {
      const labelInserts = label_ids.map((labelId: string) => ({
        work_item_id: data.id,
        label_id: labelId,
      }));

      await supabase
        .from('work_item_labels')
        .insert(labelInserts);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create work item' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Work item id is required' },
        { status: 400 }
      );
    }

    // Handle label updates separately
    const { label_ids, ...workItemUpdates } = updates;

    const { data, error } = await supabase
      .from('work_items')
      .update(workItemUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update labels if provided
    if (label_ids !== undefined) {
      // Remove existing labels
      await supabase
        .from('work_item_labels')
        .delete()
        .eq('work_item_id', id);

      // Add new labels
      if (label_ids.length > 0) {
        const labelInserts = label_ids.map((labelId: string) => ({
          work_item_id: id,
          label_id: labelId,
        }));

        await supabase
          .from('work_item_labels')
          .insert(labelInserts);
      }
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update work item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Work item id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('work_items')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete work item' }, { status: 500 });
  }
}
