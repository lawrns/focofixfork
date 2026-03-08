import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    
    const { type, source, context_id, correlation_id, causation_id, payload, prev_hash, hash } = body;
    
    const { data, error } = await supabase
      .from('ledger_events')
      .insert({
        type,
        source,
        context_id,
        correlation_id,
        causation_id,
        payload: payload || {},
        prev_hash,
        hash,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Ledger insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Ledger API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('ledger_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (type) query = query.eq('type', type);
    if (source) query = query.eq('source', source);
    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);

    const { data, error } = await query;

    if (error) {
      console.error('Ledger fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Ledger API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
