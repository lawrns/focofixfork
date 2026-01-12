import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; tag_id: string } }
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
    const tagId = params.tag_id;

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

    // Verify tag exists in the workspace
    const { data: tag } = await supabase
      .from('tags')
      .select('id, workspace_id')
      .eq('id', tagId)
      .single();

    if (!tag || tag.workspace_id !== task.workspace_id) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Delete the tag assignment (idempotent operation)
    const { error: deleteError } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId);

    if (deleteError) {
      console.error('Tag removal error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          task_id: taskId,
          tag_id: tagId,
          message: 'Tag removed from task',
        },
      },
      { status: 204 }
    );
  } catch (err: any) {
    console.error('Tag removal error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
