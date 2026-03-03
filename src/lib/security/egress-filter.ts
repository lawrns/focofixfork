/**
 * Egress domain allowlist for server-side fetch calls.
 *
 * Only domains in this list (or in ALLOWED_EGRESS_DOMAINS env var) may be
 * contacted by server-side code. All internal 127.0.0.1 addresses are always
 * allowed (they cannot route off-machine).
 *
 * Usage:
 *   assertEgressAllowed(url)  // throws if not allowed
 *   isEgressAllowed(url)      // returns boolean
 */

const BUILTIN_ALLOWED: string[] = [
  // Supabase
  'supabase.co',
  'supabase.com',
  // Telegram Bot API (our alert channel)
  'api.telegram.org',
  // Anthropic
  'api.anthropic.com',
  // OpenAI / moderation
  'api.openai.com',
  // DeepSeek
  'api.deepseek.com',
  // Z.ai / GLM
  'open.bigmodel.cn',
  'api.zhipuai.cn',
]

function getAllowedDomains(): string[] {
  const extra = process.env.ALLOWED_EGRESS_DOMAINS
    ? process.env.ALLOWED_EGRESS_DOMAINS.split(',').map(d => d.trim()).filter(Boolean)
    : []
  return [...BUILTIN_ALLOWED, ...extra]
}

export function isEgressAllowed(url: string): boolean {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return false
  }

  // Always allow loopback (internal services on the same machine)
  if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') {
    return true
  }

  const allowed = getAllowedDomains()
  return allowed.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))
}

export function assertEgressAllowed(url: string): void {
  if (!isEgressAllowed(url)) {
    const hostname = (() => { try { return new URL(url).hostname } catch { return url } })()
    throw new Error(`Egress blocked: domain "${hostname}" is not in the allowlist`)
  }
}
