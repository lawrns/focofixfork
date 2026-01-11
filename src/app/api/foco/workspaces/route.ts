import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('foco_workspaces')
      .select(`
        *,
        members:foco_workspace_members(
          user_id,
          role,
          joined_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, logo_url, settings } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('foco_workspaces')
      .insert({
        name,
        slug,
        logo_url,
        settings: settings || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
