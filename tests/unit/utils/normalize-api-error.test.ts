import { describe, expect, it } from 'vitest';
import { normalizeApiError } from '@/lib/utils/normalize-api-error';

describe('normalizeApiError', () => {
  it('returns string errors unchanged', () => {
    expect(normalizeApiError('Failed to save')).toBe('Failed to save');
  });

  it('extracts the message from structured API errors', () => {
    expect(
      normalizeApiError({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        timestamp: '2026-03-05T20:00:00.000Z',
      })
    ).toBe('Authentication required');
  });

  it('extracts nested error messages', () => {
    expect(
      normalizeApiError({
        error: {
          code: 'SOURCE_INVALID',
          message: 'Channel handle is invalid',
        },
      })
    ).toBe('Channel handle is invalid');
  });
});
