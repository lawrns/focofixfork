import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

interface SuggestionRequest {
  projectId: string
  partialTitle?: string
  partialDescription?: string
  existingTasks?: Array<{ title: string; description?: string }>
  projectName?: string
}

/**
 * Generate contextual suggestions for task titles and descriptions
 * Uses simple heuristics based on project context and existing tasks
 */
function generateSuggestions(
  projectId: string,
  projectName: string = '',
  partialTitle: string = '',
  partialDescription: string = '',
  existingTasks: Array<{ title: string; description?: string }> = []
): string[] {
  const suggestions: Set<string> = new Set()

  // Common task patterns
  const commonPatterns = [
    'Review',
    'Update',
    'Fix',
    'Add',
    'Implement',
    'Refactor',
    'Test',
    'Document',
    'Optimize',
    'Debug',
    'Investigate',
  ]

  // If we have a partial title, use it as seed for suggestions
  if (partialTitle.trim()) {
    const partial = partialTitle.trim()

    // Generate completions based on patterns
    commonPatterns.forEach((pattern) => {
      if (!partial.toLowerCase().includes(pattern.toLowerCase())) {
        suggestions.add(`${partial} ${pattern}`)
      }
    })

    // Reverse: pattern before partial
    commonPatterns.forEach((pattern) => {
      if (!partial.toLowerCase().includes(pattern.toLowerCase())) {
        suggestions.add(`${pattern} ${partial}`)
      }
    })
  } else {
    // No partial title, generate from project context
    if (projectName) {
      const projectKeywords = projectName.split(/\s+/).filter((w) => w.length > 2)

      commonPatterns.forEach((pattern) => {
        projectKeywords.forEach((keyword) => {
          suggestions.add(`${pattern} ${keyword}`)
        })
      })
    } else {
      // Fallback: generic suggestions
      suggestions.add('Review code changes')
      suggestions.add('Fix critical bug')
      suggestions.add('Add unit tests')
      suggestions.add('Update documentation')
      suggestions.add('Implement feature')
    }
  }

  // Extract verbs from existing tasks and use as patterns
  const existingVerbs = new Set<string>()
  existingTasks.slice(0, 10).forEach((task) => {
    const words = task.title.split(/\s+/)
    const firstWord = words[0]
    // Check if first word looks like a verb (capitalized, common action)
    if (
      firstWord &&
      commonPatterns.some((p) => p.toLowerCase() === firstWord.toLowerCase())
    ) {
      existingVerbs.add(firstWord)
    }
  })

  // Generate from existing patterns + remaining words from partialTitle
  if (partialTitle.trim()) {
    const partial = partialTitle.trim()
    existingVerbs.forEach((verb) => {
      suggestions.add(`${verb} ${partial}`)
    })
  }

  // Return up to 5 suggestions, filtering duplicates and empty strings
  const result = Array.from(suggestions)
    .filter((s) => s.trim().length > 0)
    .slice(0, 5)

  // If we have fewer than 3 suggestions, add fallback patterns
  if (result.length < 3) {
    const fallbacks = [
      'Review implementation',
      'Add tests',
      'Update documentation',
      'Fix issues',
      'Refactor code',
    ]

    fallbacks.forEach((fallback) => {
      if (!result.includes(fallback)) {
        result.push(fallback)
      }
    })
  }

  return result.slice(0, 5)
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(req)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: SuggestionRequest = await req.json()

    const {
      projectId,
      projectName = '',
      partialTitle = '',
      partialDescription = '',
      existingTasks = [],
    } = body

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Generate suggestions using heuristics
    const suggestions = generateSuggestions(
      projectId,
      projectName,
      partialTitle,
      partialDescription,
      existingTasks
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          suggestions,
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Suggestions API error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
