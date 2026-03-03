/**
 * Prompt injection detection and input sanitization.
 * Runs on the client (command surface) and server (API routes).
 */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(your\s+|all\s+)?(previous\s+|prior\s+)?instructions/gi,
  /(?:new|different)\s+(?:instructions|prompt|persona|system\s+prompt)/gi,
  /(?:disregard|forget)\s+(?:everything|all|your)\s+(?:above|training|instructions)/gi,
  /system\s*:\s*/gi,
  /\[system\]\s*\(/gi,
  /you\s+are\s+(?:now\s+|no\s+longer\s+)/gi,
  /(?:jailbreak|DAN\s+mode|developer\s+mode)/gi,
  /act\s+as\s+(?:an?\s+)?(?:AI|assistant|ChatGPT|GPT)\s+without/gi,
  /pretend\s+(?:you\s+are|to\s+be)\s+(?:an?\s+)?(?:unrestricted|unfiltered|uncensored)/gi,
  /<\s*\/?(?:system|assistant|user)\s*>/gi,  // XML-style role injection
]

export interface GuardResult {
  safe: boolean
  sanitized: string
  /** Pattern sources that matched (empty if safe) */
  matches: string[]
}

/**
 * Scan and sanitize user input before passing to any LLM or analysis function.
 * - Detects known injection patterns
 * - Normalizes unicode to remove homoglyphs and zero-width chars
 * - Strips control characters
 * - Enforces max length
 */
export function scanPrompt(input: string, maxLength = 4000): GuardResult {
  // 1. Normalize unicode (defeats homoglyph and zero-width attacks)
  const normalized = input.normalize('NFKC').replace(/[\u200B-\u200F\uFEFF]/g, '')

  // 2. Strip control characters (except common whitespace)
  const stripped = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')

  // 3. Enforce length limit
  const truncated = stripped.slice(0, maxLength)

  // 4. Check for injection patterns against the normalized input
  const matches = INJECTION_PATTERNS
    .filter(pattern => {
      pattern.lastIndex = 0  // reset stateful regex
      return pattern.test(truncated)
    })
    .map(p => p.source)

  return {
    safe: matches.length === 0,
    sanitized: truncated,
    matches,
  }
}
