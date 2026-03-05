import { describe, expect, it } from 'vitest'
import { detectIntent } from '@/components/command-surface/intent-detection'
import { parseTaskIntent } from '@/components/command-surface/intent-parsers'

describe('command surface intent parsing', () => {
  it('classifies daily summary scheduling requests as create_cron', () => {
    const { intent } = detectIntent('Send me a daily summary at 9 AM about openclaw usage')
    expect(intent).toBe('create_cron')
  })

  it('does not treat non-task prompts as task intents', () => {
    const parsed = parseTaskIntent('Show me the most valuable news about openclaw usage')
    expect(parsed).toBeNull()
  })
})
