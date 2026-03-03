import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  badRequestResponse,
  databaseErrorResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { buildTtsHash, synthesizeSpeech } from '@/lib/services/elevenlabs-tts'

export const dynamic = 'force-dynamic'

function estimateCostUsd(characterCount: number): number {
  return Number((characterCount * 0.00003).toFixed(6))
}

async function createSignedVoiceUrl(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 60)
  if (error) return null
  return data.signedUrl
}

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => ({}))
  const text = String(body.text ?? '').trim()
  const projectId = body.project_id ? String(body.project_id) : null
  const voiceId = String(body.voice_id ?? process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? '').trim()
  const modelId = body.model_id ? String(body.model_id) : undefined
  const options = body.options && typeof body.options === 'object' ? body.options : {}

  if (!text) {
    return mergeAuthResponse(badRequestResponse('text is required'), authResponse)
  }
  if (!voiceId) {
    return mergeAuthResponse(badRequestResponse('voice_id is required (or set ELEVENLABS_DEFAULT_VOICE_ID)'), authResponse)
  }

  const hashKey = buildTtsHash({ text, voiceId, modelId, options })

  const { data: cached } = await supabaseAdmin
    .from('voice_generations')
    .select('*')
    .eq('hash_key', hashKey)
    .eq('user_id', user.id)
    .eq('status', 'complete')
    .maybeSingle()

  if (cached) {
    const signedUrl = await createSignedVoiceUrl(cached.storage_bucket, cached.storage_path)
    return mergeAuthResponse(successResponse({
      generation: cached,
      signed_url: signedUrl,
      cached: true,
    }), authResponse)
  }

  try {
    const synthesis = await synthesizeSpeech({
      text,
      voiceId,
      modelId,
      options,
    })

    const storageBucket = 'voice-assets'
    const storagePath = `${user.id}/tts/${hashKey}.mp3`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(storageBucket)
      .upload(storagePath, synthesis.buffer, {
        contentType: synthesis.contentType,
        upsert: true,
      })

    if (uploadError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to upload synthesized audio', uploadError), authResponse)
    }

    const { data: row, error: insertError } = await supabaseAdmin
      .from('voice_generations')
      .insert({
        project_id: projectId,
        user_id: user.id,
        hash_key: hashKey,
        text_content: text,
        voice_id: voiceId,
        model_id: modelId ?? null,
        parameters: options,
        status: 'complete',
        storage_bucket: storageBucket,
        storage_path: storagePath,
        mime_type: synthesis.contentType,
        character_count: synthesis.characterCount,
        cost_usd: estimateCostUsd(synthesis.characterCount),
      })
      .select('*')
      .single()

    if (insertError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to persist voice generation', insertError), authResponse)
    }

    const signedUrl = await createSignedVoiceUrl(storageBucket, storagePath)

    return mergeAuthResponse(successResponse({
      generation: row,
      signed_url: signedUrl,
      cached: false,
    }), authResponse)
  } catch (ttsError) {
    const message = ttsError instanceof Error ? ttsError.message : 'TTS generation failed'
    return mergeAuthResponse(databaseErrorResponse('Failed to generate speech', message), authResponse)
  }
}

