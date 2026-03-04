export const HISTORY_STORAGE_KEY = 'command_surface_history_v1';

export function normalizeApiError(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
    return JSON.stringify(e);
  }
  return String(err);
}

export function summarizeOutput(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}
