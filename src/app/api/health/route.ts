import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          environment: {
            nodeEnv: process.env.NODE_ENV,
            supabaseUrl: supabaseUrl ? 'configured' : 'missing',
          },
        },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test database connectivity
    const { data, error } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1);

    const dbAccessible = !error;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      supabase: {
        connected: true,
        dbAccessible: dbAccessible,
        dbError: error?.message || '',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: 'configured',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
