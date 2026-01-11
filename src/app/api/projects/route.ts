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
    const status = searchParams.get('status');

    let query = supabase
      .from('foco_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspace_id,
      name,
      slug,
      description,
      brief,
      color,
      icon,
      owner_id,
      start_date,
      target_date,
      settings,
    } = body;

    if (!workspace_id || !name || !slug) {
      return NextResponse.json(
        { error: 'workspace_id, name, and slug are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('foco_projects')
      .insert({
        workspace_id,
        name,
        slug,
        description,
        brief,
        color: color || '#6366F1',
        icon,
        owner_id,
        start_date,
        target_date,
        settings: settings || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
