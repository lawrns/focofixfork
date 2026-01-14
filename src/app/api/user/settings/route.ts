import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

const untypedSupabase = supabase as any;

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await untypedSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await untypedSupabase
      .from('user_profiles')
      .select('full_name, timezone, language, avatar_url')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({ data: profile || {} });
  } catch (error) {
    console.error('Error in GET /api/user/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await untypedSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, timezone, language, avatar_url } = body;

    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (language !== undefined) updateData.language = language;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await untypedSupabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error in PATCH /api/user/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
