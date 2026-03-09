import type { User } from '@supabase/supabase-js'

const DEFAULT_FULL_ACCESS_EMAILS = ['clawd@fyves.com']
const DEFAULT_FULL_ACCESS_USER_IDS = ['6fc42e0d-6c01-49e5-8ca9-4c7adada029c']

function parseList(value: string | undefined, defaults: string[]): Set<string> {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  if (items.length === 0) {
    return new Set(defaults.map((item) => item.toLowerCase()))
  }

  return new Set(items)
}

const FULL_ACCESS_EMAILS = parseList(process.env.FOCO_FULL_ACCESS_EMAILS, DEFAULT_FULL_ACCESS_EMAILS)
const FULL_ACCESS_USER_IDS = parseList(process.env.FOCO_FULL_ACCESS_USER_IDS, DEFAULT_FULL_ACCESS_USER_IDS)

export function hasFounderFullAccess(user: Pick<User, 'id' | 'email'> | null | undefined): boolean {
  if (!user) return false

  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  const id = typeof user.id === 'string' ? user.id.trim().toLowerCase() : ''

  return FULL_ACCESS_EMAILS.has(email) || FULL_ACCESS_USER_IDS.has(id)
}

export function hasFounderFullAccessById(userId: string | null | undefined): boolean {
  if (typeof userId !== 'string' || userId.trim().length === 0) return false
  return FULL_ACCESS_USER_IDS.has(userId.trim().toLowerCase())
}
