import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  notFoundResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id } = await params

  const { data: generation, error: fetchError } = await supabaseAdmin
    .from('voice_generations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch voice generation', fetchError), authResponse)
  }

  if (!generation) {
    return mergeAuthResponse(notFoundResponse('Voice generation', id), authResponse)
  }

  const { data: signed, error: signedErr } = await supabaseAdmin.storage
    .from(generation.storage_bucket)
    .createSignedUrl(generation.storage_path, 60)

  if (signedErr) {
    return mergeAuthResponse(databaseErrorResponse('Failed to create signed URL', signedErr), authResponse)
  }

  return mergeAuthResponse(successResponse({
    generation,
    signed_url: signed.signedUrl,
  }), authResponse)
}

