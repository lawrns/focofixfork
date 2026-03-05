import { describe, expect, test } from 'vitest'

import { SPECIALIST_ADVISORS, getSpecialistAdvisor, wrapAdvisorTask } from '@/lib/agent-avatars'

describe('specialist advisors registry', () => {
  test('includes all newly requested long-horizon advisors with visible prompt content', () => {
    const expectedNames = [
      'Nassim Taleb',
      'Catherine Austin Fitts',
      'Ivan Illich',
      'Alfred Korzybski',
      'Jerry Mander',
      'Andrew M. Lobaczewski',
      'Marshall Sahlins',
      'David Montgomery',
      'Bill Mollison',
      'Ernst Gotsch',
    ]

    for (const name of expectedNames) {
      const advisor = SPECIALIST_ADVISORS.find((entry) => entry.name === name)
      expect(advisor, `${name} should exist in the advisor registry`).toBeDefined()
      expect(advisor?.systemPrompt).toContain('Symptoms I notice first:')
      expect(advisor?.systemPrompt).toContain('Interventions I would test first:')
      expect(advisor?.personaTags.length).toBeGreaterThan(0)
    }
  })

  test('wrapAdvisorTask injects advisor identity and dispatch prompt ahead of the user task', () => {
    const advisor = getSpecialistAdvisor('taleb')

    expect(advisor).toBeDefined()

    const wrapped = wrapAdvisorTask(advisor!, 'Audit this plan for hidden fragility')

    expect(wrapped).toContain('Advisor: Nassim Taleb')
    expect(wrapped).toContain('Role: Antifragility, Fat Tails, and Risk Asymmetry')
    expect(wrapped).toContain('Audit this plan for hidden fragility')
  })
})
