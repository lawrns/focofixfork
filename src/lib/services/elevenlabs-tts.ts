import crypto from 'crypto'
import { assertEgressAllowed } from '@/lib/security/egress-filter'

export interface TtsRequest {
  text: string
  voiceId: string
  modelId?: string
  options?: Record<string, unknown>
}

export interface TtsResult {
  buffer: Buffer
  contentType: string
  characterCount: number
}

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1'

export function buildTtsHash(input: TtsRequest): string {
  const canonical = JSON.stringify({
    text: input.text,
    voiceId: input.voiceId,
    modelId: input.modelId ?? '',
    options: input.options ?? {},
  })
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

export async function synthesizeSpeech(input: TtsRequest): Promise<TtsResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not configured')

  if (!input.text.trim()) throw new Error('Text is required for synthesis')

  const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(input.voiceId)}`
  assertEgressAllowed(url)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: input.text,
      model_id: input.modelId ?? 'eleven_multilingual_v2',
      ...(input.options ?? {}),
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${text}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || 'audio/mpeg',
    characterCount: input.text.length,
  }
}

