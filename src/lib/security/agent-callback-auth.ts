import { NextRequest } from 'next/server'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'
import crypto from 'crypto'

function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function getBearerToken(req: NextRequest): string {
  return (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
}

export function authorizeAgentCallback(req: NextRequest, rawBody = ''): boolean {
  const bearer = getBearerToken(req)
  const acceptedTokens = [
    process.env.CLAWDBOT_CALLBACK_TOKEN,
    process.env.DELEGATION_INTERNAL_TOKEN,
    process.env.OPENCLAW_SERVICE_TOKEN,
    process.env.BOSUN_SERVICE_TOKEN,
  ].filter((token): token is string => typeof token === 'string' && token.length > 0)

  if (bearer.length > 0 && acceptedTokens.some((token) => safeEquals(bearer, token))) {
    return true
  }

  return authorizeOpenClawRequest(req, rawBody)
}
