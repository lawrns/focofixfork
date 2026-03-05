export function normalizeApiError(error: unknown, fallback = 'Unknown error'): string {
  if (!error) return fallback;

  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;

    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }

    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }

    if (record.error && record.error !== error) {
      return normalizeApiError(record.error, fallback);
    }

    if (Array.isArray(record.details) && record.details.length > 0) {
      const detailMessage = record.details
        .map((detail) => normalizeApiError(detail, ''))
        .filter(Boolean)
        .join(', ');

      if (detailMessage) {
        return detailMessage;
      }
    }

    try {
      return JSON.stringify(record);
    } catch {
      return fallback;
    }
  }

  return String(error);
}
