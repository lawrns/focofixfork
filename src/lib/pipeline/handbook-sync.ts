/**
 * Handbook sync — appends Codex review learnings to handbook markdown files.
 * Reuses CLAWDBOT_SKILLS_PATH from handbook-loader conventions.
 */

import { writeFile, readFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import type { ReviewReport } from './types'

const SKILLS_BASE = process.env.CLAWDBOT_SKILLS_PATH ?? `${process.env.HOME}/clawdbot/skills`

/**
 * Append pipeline review learnings to the handbook file for the given slug.
 * Creates the file if it doesn't exist. Returns the path written.
 */
export async function appendHandbookLearnings(
  slug: string,
  additions: ReviewReport['handbook_additions'],
  taskDescription: string
): Promise<string> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) {
    throw new Error(`Invalid handbook slug: ${slug}`)
  }
  if (!additions || additions.length === 0) {
    throw new Error('No handbook additions to write')
  }

  const filePath = join(SKILLS_BASE, `${slug}.md`)

  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true })

  // Read existing content (or start fresh)
  let existing = ''
  try {
    existing = await readFile(filePath, 'utf-8')
  } catch {
    existing = `# Handbook: ${slug}\n\nAuto-generated from pipeline reviews.\n`
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const sections = additions
    .map(
      (a) =>
        `### Pattern: ${a.pattern}\n**Lesson**: ${a.lesson}\n**Applicable to**: ${a.applicable_to}`
    )
    .join('\n\n')

  const newSection = `
## Pipeline Review — ${dateStr}

**Task**: "${taskDescription.slice(0, 200)}"

${sections}
`

  await writeFile(filePath, existing + newSection, 'utf-8')
  return filePath
}
