type SourceRecord = {
  headers?: unknown;
  platform?: unknown;
  provider_config?: unknown;
  webhook_secret?: unknown;
};

const INTERNAL_PLATFORM_KEY = '__foco_platform';
const INTERNAL_PROVIDER_CONFIG_KEY = '__foco_provider_config';
const INTERNAL_WEBHOOK_SECRET_KEY = '__foco_webhook_secret';

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function getSourceHeaders(source: SourceRecord): Record<string, string> {
  const headers = asObject(source.headers);

  return Object.fromEntries(
    Object.entries(headers).filter(([key, value]) => {
      if (
        key === INTERNAL_PLATFORM_KEY ||
        key === INTERNAL_PROVIDER_CONFIG_KEY ||
        key === INTERNAL_WEBHOOK_SECRET_KEY
      ) {
        return false;
      }

      return typeof value === 'string';
    })
  ) as Record<string, string>;
}

export function getSourcePlatform(source: SourceRecord): string | null {
  if (typeof source.platform === 'string' && source.platform.trim()) {
    return source.platform;
  }

  const headers = asObject(source.headers);
  const platform = headers[INTERNAL_PLATFORM_KEY];
  return typeof platform === 'string' && platform.trim() ? platform : null;
}

export function getSourceProviderConfig(source: SourceRecord): Record<string, unknown> {
  if (source.provider_config && typeof source.provider_config === 'object' && !Array.isArray(source.provider_config)) {
    return source.provider_config as Record<string, unknown>;
  }

  const headers = asObject(source.headers);
  const providerConfig = headers[INTERNAL_PROVIDER_CONFIG_KEY];
  if (providerConfig && typeof providerConfig === 'object' && !Array.isArray(providerConfig)) {
    return providerConfig as Record<string, unknown>;
  }

  return {};
}

export function getSourceWebhookSecret(source: SourceRecord): string | null {
  if (typeof source.webhook_secret === 'string' && source.webhook_secret.trim()) {
    return source.webhook_secret;
  }

  const headers = asObject(source.headers);
  const webhookSecret = headers[INTERNAL_WEBHOOK_SECRET_KEY];
  return typeof webhookSecret === 'string' && webhookSecret.trim() ? webhookSecret : null;
}

export function mergeSourceHeaders(
  headers: unknown,
  options: {
    platform?: string | null;
    providerConfig?: Record<string, unknown> | null;
    webhookSecret?: string | null;
  }
): Record<string, unknown> {
  const nextHeaders = { ...asObject(headers) };

  if (options.platform) {
    nextHeaders[INTERNAL_PLATFORM_KEY] = options.platform;
  } else {
    delete nextHeaders[INTERNAL_PLATFORM_KEY];
  }

  if (options.providerConfig && Object.keys(options.providerConfig).length > 0) {
    nextHeaders[INTERNAL_PROVIDER_CONFIG_KEY] = options.providerConfig;
  } else {
    delete nextHeaders[INTERNAL_PROVIDER_CONFIG_KEY];
  }

  if (options.webhookSecret) {
    nextHeaders[INTERNAL_WEBHOOK_SECRET_KEY] = options.webhookSecret;
  } else {
    delete nextHeaders[INTERNAL_WEBHOOK_SECRET_KEY];
  }

  return nextHeaders;
}
