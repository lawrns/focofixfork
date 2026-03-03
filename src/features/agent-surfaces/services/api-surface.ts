/**
 * API Surface Service
 * Executes API calls and webhooks with egress filtering
 */

import { assertEgressAllowed, isEgressAllowed } from '@/lib/security/egress-filter';
import type { ApiAction } from '../types';

export interface ApiExecutionResult {
  success: boolean;
  data?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    responseTimeMs: number;
  };
  error?: string;
}

/**
 * Execute an API call with egress validation
 */
export async function executeApiCall(
  action: ApiAction,
  options: {
    timeout?: number;
    retries?: number;
    validateEgress?: boolean;
  } = {}
): Promise<ApiExecutionResult> {
  const { timeout = 30000, retries = 0, validateEgress = true } = options;

  // Validate egress if enabled
  if (validateEgress) {
    try {
      assertEgressAllowed(action.url);
    } catch (error) {
      return {
        success: false,
        error: `Egress blocked: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  const startTime = Date.now();
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(action.url, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          ...action.headers,
        },
        body: action.body ? JSON.stringify(action.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody: unknown;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      // Success range: 200-299
      if (response.ok) {
        return {
          success: true,
          data: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody,
            responseTimeMs: Date.now() - startTime,
          },
        };
      }

      // Server error, retry if attempts remain
      if (response.status >= 500 && attempt < retries) {
        attempt++;
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
        continue;
      }

      // Client error or no retries
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
          responseTimeMs: Date.now() - startTime,
        },
      };

    } catch (error) {
      if (attempt < retries) {
        attempt++;
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Execute a webhook with signature validation support
 */
export async function executeWebhook(
  url: string,
  payload: unknown,
  options: {
    secret?: string;
    timeout?: number;
    validateEgress?: boolean;
  } = {}
): Promise<ApiExecutionResult> {
  const { secret, timeout = 30000, validateEgress = true } = options;

  if (validateEgress && !isEgressAllowed(url)) {
    return {
      success: false,
      error: 'Egress blocked: URL not in allowlist',
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add signature if secret provided
  if (secret) {
    const signature = await generateWebhookSignature(payload, secret);
    headers['X-Webhook-Signature'] = signature;
  }

  return executeApiCall({
    type: 'webhook',
    method: 'POST',
    url,
    headers,
    body: payload,
  }, { timeout, validateEgress: false }); // Already validated
}

/**
 * Generate HMAC signature for webhook
 */
async function generateWebhookSignature(
  payload: unknown,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return 'sha256=' + btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Validate that a URL is safe to call
 */
export function validateApiUrl(url: string): { valid: boolean; error?: string } {
  try {
    assertEgressAllowed(url);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid URL',
    };
  }
}

/**
 * Get allowed domains for display
 */
export function getAllowedDomains(): string[] {
  // From egress-filter.ts
  return [
    'supabase.co',
    'supabase.com',
    'api.telegram.org',
    'api.anthropic.com',
    'api.openai.com',
    'api.deepseek.com',
    'open.bigmodel.cn',
    'api.zhipuai.cn',
  ];
}
