/**
 * OpenClaw Personality Configuration API
 * GET: Load complete personality configuration from all files
 * POST: Save complete personality configuration to all files
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadPersonalityConfig, savePersonalityConfig } from '@/lib/openclaw/files';
import type { OpenClawApiResponse, PersonalityConfig } from '@/lib/openclaw/types';

export async function GET(): Promise<NextResponse<OpenClawApiResponse<unknown>>> {
  try {
    const config = await loadPersonalityConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Failed to load personality config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load personality configuration' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<OpenClawApiResponse<unknown>>> {
  try {
    const body = await request.json();
    const config = body as PersonalityConfig;

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid configuration object' },
        { status: 400 }
      );
    }

    // Validate required sections
    const required = ['identity', 'soul', 'agents', 'user', 'heartbeat'];
    for (const section of required) {
      if (!config[section as keyof PersonalityConfig]) {
        return NextResponse.json(
          { success: false, error: `Missing required section: ${section}` },
          { status: 400 }
        );
      }
    }

    await savePersonalityConfig(config);
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to save personality config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save personality configuration' },
      { status: 500 }
    );
  }
}
