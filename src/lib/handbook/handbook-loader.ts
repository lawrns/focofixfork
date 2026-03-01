import { readFile } from 'fs/promises'
import { glob } from 'glob'
import * as path from 'path'
import * as yaml from 'js-yaml'

export interface HandbookSection {
  title: string
  content: string
  metadata?: Record<string, unknown>
}

export interface AgentHandbook {
  projectSlug: string
  sections: HandbookSection[]
  businessRules: string[]
  constraints: string[]
  examples: string[]
  rawContent: string
}

const SKILLS_BASE_PATH = process.env.CLAWDBOT_SKILLS_PATH ?? '/home/laurence/clawdbot/skills'

/**
 * List available handbook slugs from the skills directory.
 */
export async function listHandbooks(): Promise<string[]> {
  try {
    const { readdir } = await import('fs/promises')
    const files = await readdir(SKILLS_BASE_PATH)
    return files
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''))
  } catch {
    return []
  }
}

/**
 * Load handbook files for a project from the skills directory
 * Supports both markdown (.md) and YAML (.yaml, .yml) files
 */
export async function loadHandbook(projectSlug: string): Promise<AgentHandbook | null> {
  try {
    const projectPath = path.join(SKILLS_BASE_PATH, projectSlug)
    const files = await glob('**/*.{md,yaml,yml}', { 
      cwd: projectPath,
      absolute: true 
    })

    if (files.length === 0) {
      return null
    }

    const sections: HandbookSection[] = []
    const businessRules: string[] = []
    const constraints: string[] = []
    const examples: string[] = []
    const rawParts: string[] = []

    for (const file of files.sort()) {
      const content = await readFile(file, 'utf-8')
      const ext = path.extname(file)
      const basename = path.basename(file, ext)

      rawParts.push(`\n=== ${basename} ===\n${content}`)

      if (ext === '.md') {
        // Parse markdown for sections
        const parsed = parseMarkdownSections(content, basename)
        sections.push(...parsed.sections)
        businessRules.push(...parsed.businessRules)
        constraints.push(...parsed.constraints)
        examples.push(...parsed.examples)
      } else {
        // Parse YAML files
        try {
          const parsed = yaml.load(content) as Record<string, unknown>
          if (parsed) {
            sections.push({
              title: parsed.title as string || basename,
              content: JSON.stringify(parsed, null, 2),
              metadata: parsed
            })
            
            if (parsed.businessRules) {
              businessRules.push(...(parsed.businessRules as string[]))
            }
            if (parsed.constraints) {
              constraints.push(...(parsed.constraints as string[]))
            }
            if (parsed.examples) {
              examples.push(...(parsed.examples as string[]))
            }
          }
        } catch (e) {
          // If YAML parsing fails, treat as raw content
          sections.push({
            title: basename,
            content
          })
        }
      }
    }

    return {
      projectSlug,
      sections,
      businessRules,
      constraints,
      examples,
      rawContent: rawParts.join('\n')
    }
  } catch (error) {
    console.error(`Failed to load handbook for ${projectSlug}:`, error)
    return null
  }
}

/**
 * Parse markdown content for structured sections
 */
function parseMarkdownSections(content: string, defaultTitle: string): {
  sections: HandbookSection[]
  businessRules: string[]
  constraints: string[]
  examples: string[]
} {
  const sections: HandbookSection[] = []
  const businessRules: string[] = []
  const constraints: string[] = []
  const examples: string[] = []

  // Split by headers
  const headerRegex = /^(#{1,3})\s+(.+)$/gm
  const matches = Array.from(content.matchAll(headerRegex))
  
  if (matches.length === 0) {
    // No headers, treat entire content as one section
    sections.push({
      title: defaultTitle,
      content: content.trim()
    })
    return { sections, businessRules, constraints, examples }
  }

  // Parse sections based on headers
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const title = match[2]
    const startIdx = match.index!
    const endIdx = i < matches.length - 1 ? matches[i + 1].index! : content.length
    const sectionContent = content.slice(startIdx, endIdx).replace(/^#{1,3}\s+.+$/m, '').trim()

    sections.push({
      title,
      content: sectionContent
    })

    // Extract special sections
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('business rule') || lowerTitle.includes('rule')) {
      const rules = sectionContent
        .split(/\n-|\n\*/)
        .map(r => r.trim())
        .filter(r => r && r.length > 10)
      businessRules.push(...rules)
    }
    if (lowerTitle.includes('constraint') || lowerTitle.includes('limit')) {
      const cons = sectionContent
        .split(/\n-|\n\*/)
        .map(c => c.trim())
        .filter(c => c && c.length > 5)
      constraints.push(...cons)
    }
    if (lowerTitle.includes('example') || lowerTitle.includes('sample')) {
      examples.push(sectionContent)
    }
  }

  return { sections, businessRules, constraints, examples }
}

/**
 * Format handbook for injection into agent context
 */
export function formatHandbookForAgent(handbook: AgentHandbook | null): string {
  if (!handbook) {
    return ''
  }

  const parts: string[] = [
    `## Project Handbook: ${handbook.projectSlug}\n`,
  ]

  if (handbook.businessRules.length > 0) {
    parts.push('### Business Rules')
    parts.push(handbook.businessRules.map(r => `- ${r}`).join('\n'))
    parts.push('')
  }

  if (handbook.constraints.length > 0) {
    parts.push('### Constraints')
    parts.push(handbook.constraints.map(c => `- ${c}`).join('\n'))
    parts.push('')
  }

  if (handbook.examples.length > 0) {
    parts.push('### Examples')
    handbook.examples.forEach((ex, i) => {
      parts.push(`#### Example ${i + 1}`)
      parts.push(ex)
      parts.push('')
    })
  }

  if (handbook.sections.length > 0) {
    parts.push('### Additional Context')
    handbook.sections.forEach(section => {
      parts.push(`#### ${section.title}`)
      parts.push(section.content.slice(0, 2000)) // Limit content length
      parts.push('')
    })
  }

  return parts.join('\n')
}

/**
 * Get handbook summary for logging/debugging
 */
export function getHandbookSummary(handbook: AgentHandbook | null): {
  hasHandbook: boolean
  sectionCount: number
  ruleCount: number
  constraintCount: number
  exampleCount: number
} {
  if (!handbook) {
    return {
      hasHandbook: false,
      sectionCount: 0,
      ruleCount: 0,
      constraintCount: 0,
      exampleCount: 0
    }
  }

  return {
    hasHandbook: true,
    sectionCount: handbook.sections.length,
    ruleCount: handbook.businessRules.length,
    constraintCount: handbook.constraints.length,
    exampleCount: handbook.examples.length
  }
}
