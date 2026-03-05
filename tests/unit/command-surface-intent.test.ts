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

  it('does not classify analytical prompts containing "implement" as create_task', () => {
    const prompt =
      'Analyze the codebase and provide implementation assessment with speed to implement and risk.'
    const detected = detectIntent(prompt)
    const parsed = parseTaskIntent(prompt)

    expect(detected.intent).not.toBe('create_task')
    expect(parsed).toBeNull()
  })

  it('still classifies direct implementation commands as tasks', () => {
    const parsed = parseTaskIntent('Implement dark mode for the dashboard')
    expect(parsed).not.toBeNull()
    expect(parsed?.title.toLowerCase()).toContain('dark mode')
  })
})
