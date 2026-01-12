import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { z } from 'zod';

const AssignTagSchema = z.object({
  tag_ids: z.array(z.string().uuid()).min(1, 'At least one tag is required'),
});

const RemoveTagSchema = z.object({
  tag_id: z.string().uuid('Invalid tag ID'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const taskId = params.id;

    // Verify task exists and user has access
    const { data: task } = await supabase
      .from('work_items')
      .select('id, workspace_id')
      .eq('id', taskId)
      .single();

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Verify user has access to workspace
    const { data: workspaceAccess } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!workspaceAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch task tags
    const { data: tags, error: tagsError } = await supabase
      .from('task_tags')
      .select('tag_id, tags(id, name, color, workspace_id)')
      .eq('task_id', taskId);

    if (tagsError) {
      console.error('Task tags fetch error:', tagsError);
      return NextResponse.json(
        { success: false, error: tagsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        task_id: taskId,
        tags: tags.map((t: any) => t.tags).filter(Boolean),
      },
    });
  } catch (err: any) {
    console.error('Task tags GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const taskId = params.id;
    const body = await req.json();

    // Validate request
    const validationResult = AssignTagSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { tag_ids } = validationResult.data;

    // Verify task exists and user has access
    const { data: task } = await supabase
      .from('work_items')
      .select('id, workspace_id')
      .eq('id', taskId)
      .single();

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Verify user has access to workspace
    const { data: workspaceAccess } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!workspaceAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Verify all tags belong to the same workspace
    const { data: tags } = await supabase
      .from('tags')
      .select('id, workspace_id')
      .in('id', tag_ids);

    if (!tags || tags.length !== tag_ids.length) {
      return NextResponse.json(
        { success: false, error: 'One or more tags not found' },
        { status: 404 }
      );
    }

    if (!tags.every(t => t.workspace_id === task.workspace_id)) {
      return NextResponse.json(
        { success: false, error: 'Tags must belong to the same workspace' },
        { status: 400 }
      );
    }

    // Get existing tags for this task
    const { data: existingTags } = await supabase
      .from('task_tags')
      .select('tag_id')
      .eq('task_id', taskId);

    const existingTagIds = (existingTags || []).map(t => t.tag_id);

    // Find tags to add (new ones)
    const tagsToAdd = tag_ids.filter(id => !existingTagIds.includes(id));

    // Insert new tag assignments
    if (tagsToAdd.length > 0) {
      const insertData = tagsToAdd.map(tag_id => ({
        task_id: taskId,
        tag_id,
      }));

      const { error: insertError } = await supabase
        .from('task_tags')
        .insert(insertData);

      if (insertError) {
        console.error('Tag assignment error:', insertError);
        return NextResponse.json(
          { success: false, error: insertError.message },
          { status: 500 }
        );
      }
    }

    // Fetch and return all tags for the task
    const { data: updatedTags } = await supabase
      .from('task_tags')
      .select('tags(id, name, color)')
      .eq('task_id', taskId);

    return NextResponse.json(
      {
        success: true,
        data: {
          task_id: taskId,
          tags: updatedTags?.map(t => (t as any).tags).filter(Boolean) || [],
          added_count: tagsToAdd.length,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Task tags POST error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
