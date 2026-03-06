const POSTGRES_URL_REGEX = /\bpostgres(?:ql)?:\/\/[^\s]+/gi
const JWT_REGEX = /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9._-]{8,}\.[a-zA-Z0-9._-]{8,}\b/g
const BEARER_REGEX = /\bBearer\s+[A-Za-z0-9._-]{16,}\b/gi
const SERVICE_ROLE_REGEX = /\bservice[_ -]?role\b[:\s-]*[A-Za-z0-9._-]{16,}\b/gi
const GENERIC_SECRET_REGEX = /\b(?:api[_ -]?key|secret|token|password)\b[:=\s-]*[A-Za-z0-9._/-]{12,}\b/gi

const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [POSTGRES_URL_REGEX, '[REDACTED_DATABASE_URL]'],
  [JWT_REGEX, '[REDACTED_JWT]'],
  [BEARER_REGEX, 'Bearer [REDACTED_TOKEN]'],
  [SERVICE_ROLE_REGEX, 'service role [REDACTED]'],
  [GENERIC_SECRET_REGEX, '[REDACTED_SECRET]'],
]

export function redactSensitiveText(input: string): string {
  return REDACTION_PATTERNS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), input)
}

export function containsSensitiveText(input: string): boolean {
  return redactSensitiveText(input) !== input
}
