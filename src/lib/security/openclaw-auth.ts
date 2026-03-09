import crypto from 'crypto'
import fs from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function getBearerToken(req: NextRequest): string {
  return (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
}

function getGatewayTokenFromConfig(): string {
  try {
    const root = process.env.OPENCLAW_CONFIG_PATH?.trim()
      ? path.join(process.env.OPENCLAW_CONFIG_PATH.trim(), 'openclaw.json')
      : path.join(process.env.HOME ?? '/tmp', '.openclaw', 'openclaw.json')
    const raw = fs.readFileSync(root, 'utf8')
    const parsed = JSON.parse(raw) as {
      gateway?: {
        auth?: {
          token?: unknown
        }
      }
    }
    const token = parsed.gateway?.auth?.token
    return typeof token === 'string' ? token.trim() : ''
  } catch {
    return ''
  }
}

export function buildOpenClawSignature(
  secret: string,
  req: NextRequest,
  rawBody: string = ''
): string {
  const timestamp = req.headers.get('x-openclaw-timestamp') ?? ''
  const payload = `${timestamp}.${req.method}.${new URL(req.url).pathname}.${rawBody}`
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifyOpenClawSignature(
  req: NextRequest,
  rawBody: string = ''
): boolean {
  const secret = process.env.OPENCLAW_EVENT_SIGNING_SECRET ?? ''
  if (!secret) return false

  const signature = req.headers.get('x-openclaw-signature') ?? ''
  const timestamp = req.headers.get('x-openclaw-timestamp') ?? ''
  if (!signature || !timestamp) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  if (Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) return false

  const expected = buildOpenClawSignature(secret, req, rawBody)
  return safeEquals(signature, expected)
}

export function authorizeOpenClawRequest(
  req: NextRequest,
  rawBody: string = ''
): boolean {
  const acceptedTokens = [
    process.env.OPENCLAW_SERVICE_TOKEN,
    process.env.BOSUN_SERVICE_TOKEN,
    process.env.FOCO_OPENCLAW_TOKEN,
    process.env.OPENCLAW_GATEWAY_TOKEN,
    getGatewayTokenFromConfig(),
  ].filter((token): token is string => typeof token === 'string' && token.length > 0)
  const bearer = getBearerToken(req)
  if (bearer && acceptedTokens.some((token) => safeEquals(bearer, token))) return true

  return verifyOpenClawSignature(req, rawBody)
}
