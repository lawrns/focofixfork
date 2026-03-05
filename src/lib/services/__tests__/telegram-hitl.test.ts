import { describe, expect, it } from 'vitest'
import { parsePivotalCallbackData, parsePivotalCommandText } from '@/lib/services/telegram-hitl'

const PIVOTAL_ID = '11111111-2222-4333-8444-555555555555'

describe('telegram-hitl parsers', () => {
  it('parses callback payloads for pivotal resolution', () => {
    const parsed = parsePivotalCallbackData(`piv:${PIVOTAL_ID}:approve`)
    expect(parsed).toEqual({
      pivotalId: PIVOTAL_ID,
      decision: 'approve',
    })
  })

  it('rejects malformed callback payloads', () => {
    expect(parsePivotalCallbackData('bad:data')).toBeNull()
    expect(parsePivotalCallbackData(`piv:${PIVOTAL_ID}:accept`)).toBeNull()
  })

  it('parses slash commands for pivotal resolution', () => {
    const parsed = parsePivotalCommandText(`/resolve_pivotal ${PIVOTAL_ID} reject`)
    expect(parsed).toEqual({
      pivotalId: PIVOTAL_ID,
      decision: 'reject',
    })
  })

  it('rejects invalid slash commands', () => {
    expect(parsePivotalCommandText('/pivotal')).toBeNull()
    expect(parsePivotalCommandText(`/pivotal ${PIVOTAL_ID} maybe`)).toBeNull()
  })
})
