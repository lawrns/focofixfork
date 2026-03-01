import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

const SKILLS_BASE = process.env.CLAWDBOT_SKILLS_PATH ?? `${process.env.HOME}/clawdbot/skills`

/**
 * List available handbook slugs from the skills directory.
 */
export async function listHandbooks(): Promise<string[]> {
  try {
    const files = await readdir(SKILLS_BASE)
    return files
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''))
  } catch {
    return []
  }
}

/**
 * Load handbook content for a given slug.
 * Returns empty string if not found.
 */
export async function loadHandbook(slug: string): Promise<string> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) return ''
  try {
    const filePath = join(SKILLS_BASE, `${slug}.md`)
    return await readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}
