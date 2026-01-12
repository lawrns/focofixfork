import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { z } from 'zod';

const CreateTagSchema = z.object({
  workspace_id: z.string().uuid('Invalid workspace ID'),
  name: z.string().min(1, 'Tag name is required').max(255),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format'),
});

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    // Verify user has access to workspace
    const { data: workspaceAccess } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!workspaceAccess) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    // Fetch tags with usage count from the view
    const { data, error: queryError } = await supabase
      .from('tag_usage_counts')
      .select('id, name, color, usage_count, created_at')
      .eq('workspace_id', workspaceId)
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (queryError) {
      console.error('Tags fetch error:', queryError);
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tags: data || [],
        pagination: { limit, offset, total: data?.length || 0 },
      },
    });
  } catch (err: any) {
    console.error('Tags GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validate request
    const validationResult = CreateTagSchema.safeParse(body);
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

    const { workspace_id, name, color } = validationResult.data;

    // Verify user has admin access to workspace
    const { data: workspaceAccess } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!workspaceAccess || !['owner', 'admin'].includes(workspaceAccess.role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions to create tags',
        },
        { status: 403 }
      );
    }

    // Create tag
    const { data, error: insertError } = await supabase
      .from('tags')
      .insert({
        workspace_id,
        name: name.trim(),
        color,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a unique constraint violation
      if (insertError.message.includes('unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
      console.error('Tag create error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    console.error('Tags POST error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
