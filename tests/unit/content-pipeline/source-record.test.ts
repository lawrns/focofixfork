import { describe, expect, it } from 'vitest';
import {
  getSourceHeaders,
  getSourcePlatform,
  getSourceProviderConfig,
  getSourceWebhookSecret,
  mergeSourceHeaders,
} from '@/features/content-pipeline/server/source-record';

describe('content-pipeline source record helpers', () => {
  it('reads social metadata from embedded headers when schema columns are absent', () => {
    const source = {
      headers: {
        Authorization: 'Bearer token',
        __foco_platform: 'twitter',
        __foco_provider_config: { actor_id: 'apidojo/tweet-scraper' },
        __foco_webhook_secret: 'secret-123',
      },
    };

    expect(getSourcePlatform(source)).toBe('twitter');
    expect(getSourceProviderConfig(source)).toEqual({ actor_id: 'apidojo/tweet-scraper' });
    expect(getSourceWebhookSecret(source)).toBe('secret-123');
    expect(getSourceHeaders(source)).toEqual({ Authorization: 'Bearer token' });
  });

  it('preserves public headers while embedding internal metadata', () => {
    expect(
      mergeSourceHeaders(
        { Authorization: 'Bearer token' },
        {
          platform: 'youtube',
          providerConfig: { actor_id: 'streamers/youtube-channel-scraper' },
          webhookSecret: 'hook-secret',
        }
      )
    ).toEqual({
      Authorization: 'Bearer token',
      __foco_platform: 'youtube',
      __foco_provider_config: { actor_id: 'streamers/youtube-channel-scraper' },
      __foco_webhook_secret: 'hook-secret',
    });
  });
});
