import { describe, expect, it } from 'vitest'
import { buildTtsHash } from '@/lib/services/elevenlabs-tts'

describe('buildTtsHash', () => {
  it('returns same hash for same payload', () => {
    const payload = {
      text: 'Ship the release summary',
      voiceId: 'voice_123',
      modelId: 'eleven_multilingual_v2',
      options: { stability: 0.4 },
    }

    expect(buildTtsHash(payload)).toBe(buildTtsHash(payload))
  })

  it('changes hash when text changes', () => {
    const base = {
      voiceId: 'voice_123',
      modelId: 'eleven_multilingual_v2',
      options: { stability: 0.4 },
    }
    const a = buildTtsHash({ ...base, text: 'hello' })
    const b = buildTtsHash({ ...base, text: 'hello world' })

    expect(a).not.toBe(b)
  })
})

