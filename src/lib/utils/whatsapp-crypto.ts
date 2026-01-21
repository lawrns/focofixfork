/**
 * WhatsApp Webhook Security Utilities (Twilio)
 * Implements signature verification for Twilio webhooks
 */

import crypto from 'crypto';

/**
 * Verifies the webhook signature from Twilio
 *
 * Twilio sends a signature in the X-Twilio-Signature header.
 * The signature is a Base64 encoded HMAC-SHA1 hash of the URL + sorted POST params.
 *
 * @param url - The full webhook URL (including https://)
 * @param params - POST parameters as key-value pairs
 * @param signature - Signature from X-Twilio-Signature header
 * @param authToken - Twilio Auth Token or API Key Secret
 * @returns True if signature is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = verifyTwilioSignature(
 *   'https://yourdomain.com/api/integrations/whatsapp/webhook',
 *   { From: 'whatsapp:+1234567890', Body: 'Hello' },
 *   request.headers.get('X-Twilio-Signature'),
 *   process.env.TWILIO_API_KEY_SECRET
 * );
 * ```
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
  authToken: string
): boolean {
  if (!signature) {
    return false;
  }

  // Build data string: URL + sorted params
  const sortedKeys = Object.keys(params).sort();
  let dataString = url;
  for (const key of sortedKeys) {
    dataString += key + params[key];
  }

  // Compute expected signature (HMAC-SHA1 Base64)
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(dataString, 'utf-8')
    .digest('base64');

  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    // Buffers not equal length
    return false;
  }
}

/**
 * Legacy Meta webhook signature verification (kept for reference)
 * @deprecated Use verifyTwilioSignature instead
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) {
    return false;
  }

  const signatureHash = signature.replace('sha256=', '');
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Generates a 6-digit verification code for phone linking
 *
 * @returns 6-digit numeric string (e.g., "123456")
 *
 * @example
 * ```typescript
 * const code = generateVerificationCode(); // "847291"
 * ```
 */
export function generateVerificationCode(): string {
  // Generate random 6-digit number (100000-999999)
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}

/**
 * Validates phone number format (E.164)
 *
 * E.164 format: +[country code][number]
 * - Examples: +14155552671, +442071838750, +525512345678
 * - Max length: 15 digits (including country code)
 *
 * @param phone - Phone number to validate
 * @returns True if valid E.164 format
 *
 * @example
 * ```typescript
 * validatePhoneFormat('+14155552671'); // true
 * validatePhoneFormat('14155552671');  // false (missing +)
 * validatePhoneFormat('+1-415-555-2671'); // false (has dashes)
 * ```
 */
export function validatePhoneFormat(phone: string): boolean {
  // E.164 regex: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Sanitizes phone number to E.164 format
 * Removes spaces, dashes, parentheses, and ensures + prefix
 *
 * @param phone - Phone number in any format
 * @returns Phone number in E.164 format or null if invalid
 *
 * @example
 * ```typescript
 * sanitizePhone('(415) 555-2671');     // '+14155552671' (assumes US)
 * sanitizePhone('+1-415-555-2671');    // '+14155552671'
 * sanitizePhone('415 555 2671');       // '+14155552671' (assumes US)
 * ```
 */
export function sanitizePhone(phone: string, defaultCountryCode = '1'): string | null {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If doesn't start with +, add country code
  if (!cleaned.startsWith('+')) {
    cleaned = `+${defaultCountryCode}${cleaned}`;
  }

  // Validate E.164 format
  if (!validatePhoneFormat(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Extract phone number from Twilio's whatsapp: format
 *
 * @param twilioNumber - Number in "whatsapp:+1234567890" format
 * @returns Phone number in E.164 format
 *
 * @example
 * ```typescript
 * extractPhoneFromTwilio('whatsapp:+14155552671'); // '+14155552671'
 * ```
 */
export function extractPhoneFromTwilio(twilioNumber: string): string {
  return twilioNumber.replace('whatsapp:', '');
}
