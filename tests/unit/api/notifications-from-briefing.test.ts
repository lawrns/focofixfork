import { describe, it, expect } from 'vitest'

// Extract the notification generation logic for testing
// This mirrors the logic in the from-briefing API route
function extractNotificationsFromBriefing(briefing: any): Array<{ type: string; title: string; body: string }> {
  const notifications: Array<{ type: string; title: string; body: string }> = []

  const recommendations = briefing.sections?.recommendations ?? []
  for (const rec of recommendations.slice(0, 3)) {
    notifications.push({
      type: 'ai_flag',
      title: `Briefing: ${typeof rec === 'string' ? rec.slice(0, 80) : 'New recommendation'}`,
      body: typeof rec === 'string' ? rec : JSON.stringify(rec),
    })
  }

  const topRepos = briefing.sections?.top_repos ?? []
  for (const repo of topRepos.filter((r: any) => (r.score ?? 0) >= 8).slice(0, 2)) {
    notifications.push({
      type: 'ai_flag',
      title: `High-signal repo: ${repo.name}`,
      body: repo.description || repo.verdict || 'Scored highly in intelligence scan',
    })
  }

  const social = briefing.social_intelligence
  if (social && social.top_insights?.length > 0) {
    const topInsight = social.top_insights[0]
    if (topInsight.relevance >= 0.7) {
      notifications.push({
        type: 'ai_flag',
        title: `Intelligence: ${topInsight.summary?.slice(0, 80) ?? 'High relevance signal'}`,
        body: topInsight.summary ?? '',
      })
    }
  }

  return notifications
}

describe('extractNotificationsFromBriefing', () => {
  it('extracts notifications from recommendations (max 3)', () => {
    const briefing = {
      sections: {
        recommendations: [
          'Upgrade CI pipeline',
          'Refactor auth module',
          'Add integration tests',
          'This fourth one should be ignored',
        ],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(3)
    expect(result[0].title).toBe('Briefing: Upgrade CI pipeline')
    expect(result[0].type).toBe('ai_flag')
    expect(result[0].body).toBe('Upgrade CI pipeline')
    expect(result[2].title).toBe('Briefing: Add integration tests')
  })

  it('extracts high-score repos (score >= 8)', () => {
    const briefing = {
      sections: {
        top_repos: [
          { name: 'cool-lib', score: 9, description: 'A cool library' },
          { name: 'another-lib', score: 8, verdict: 'Worth watching' },
        ],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('High-signal repo: cool-lib')
    expect(result[0].body).toBe('A cool library')
    expect(result[1].title).toBe('High-signal repo: another-lib')
    expect(result[1].body).toBe('Worth watching')
  })

  it('ignores low-score repos (score < 8)', () => {
    const briefing = {
      sections: {
        top_repos: [
          { name: 'mediocre-lib', score: 5, description: 'Average library' },
          { name: 'ok-lib', score: 7, description: 'Decent library' },
        ],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(0)
  })

  it('extracts social intelligence with high relevance', () => {
    const briefing = {
      social_intelligence: {
        top_insights: [
          { summary: 'Major shift in AI tooling landscape', relevance: 0.85 },
        ],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Intelligence: Major shift in AI tooling landscape')
    expect(result[0].body).toBe('Major shift in AI tooling landscape')
    expect(result[0].type).toBe('ai_flag')
  })

  it('ignores social intelligence with low relevance', () => {
    const briefing = {
      social_intelligence: {
        top_insights: [
          { summary: 'Minor update', relevance: 0.3 },
        ],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(0)
  })

  it('handles empty briefing gracefully', () => {
    const result = extractNotificationsFromBriefing({})
    expect(result).toHaveLength(0)
  })

  it('handles missing sections gracefully', () => {
    const briefing = {
      sections: {},
      social_intelligence: null,
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(0)
  })

  it('truncates long recommendation titles to 80 chars', () => {
    const longRec = 'A'.repeat(120)
    const briefing = {
      sections: {
        recommendations: [longRec],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(1)
    // Title is "Briefing: " + first 80 chars of the recommendation
    expect(result[0].title).toBe(`Briefing: ${'A'.repeat(80)}`)
    expect(result[0].title.length).toBe('Briefing: '.length + 80)
    // Body retains the full text
    expect(result[0].body).toBe(longRec)
  })

  it('handles non-string recommendations by using fallback title', () => {
    const briefing = {
      sections: {
        recommendations: [{ action: 'do something', priority: 'high' }],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Briefing: New recommendation')
    expect(result[0].body).toBe('{"action":"do something","priority":"high"}')
  })

  it('uses fallback body for repos without description or verdict', () => {
    const briefing = {
      sections: {
        top_repos: [{ name: 'bare-repo', score: 10 }],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(1)
    expect(result[0].body).toBe('Scored highly in intelligence scan')
  })

  it('limits high-score repos to max 2', () => {
    const briefing = {
      sections: {
        top_repos: [
          { name: 'repo-a', score: 9, description: 'A' },
          { name: 'repo-b', score: 10, description: 'B' },
          { name: 'repo-c', score: 8, description: 'C' },
        ],
      },
    }
    const result = extractNotificationsFromBriefing(briefing)
    expect(result).toHaveLength(2)
    expect(result[0].title).toContain('repo-a')
    expect(result[1].title).toContain('repo-b')
  })
})
