export type SocialPlatform = 'twitter' | 'instagram' | 'youtube';

interface ApifyConfig {
  actor_id: string;
  actor_input: Record<string, unknown>;
}

interface PlatformMeta {
  label: string;
  icon: string; // lucide icon name
  placeholder: string;
  urlPattern: string;
}

export const platformMeta: Record<SocialPlatform, PlatformMeta> = {
  twitter: {
    label: 'Twitter / X',
    icon: 'Twitter',
    placeholder: '@elonmusk or username',
    urlPattern: 'https://x.com/{handle}',
  },
  instagram: {
    label: 'Instagram',
    icon: 'Instagram',
    placeholder: '@username',
    urlPattern: 'https://instagram.com/{handle}',
  },
  youtube: {
    label: 'YouTube',
    icon: 'Youtube',
    placeholder: 'Channel URL or @handle',
    urlPattern: 'https://youtube.com/@{handle}',
  },
};

const APIFY_ACTORS: Record<SocialPlatform, string> = {
  twitter: 'apidojo/tweet-scraper',
  instagram: 'apify/instagram-post-scraper',
  youtube: 'streamers/youtube-channel-scraper',
};

export function validateHandle(platform: SocialPlatform, input: string): { valid: boolean; handle: string; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, handle: '', error: 'Handle is required' };
  }

  switch (platform) {
    case 'twitter': {
      // Strip @ prefix, extract from URL
      let handle = trimmed;
      if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
        const match = handle.match(/(?:x\.com|twitter\.com)\/(@?\w+)/);
        handle = match?.[1] ?? handle;
      }
      handle = handle.replace(/^@/, '');
      if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
        return { valid: false, handle, error: 'Invalid Twitter handle' };
      }
      return { valid: true, handle };
    }
    case 'instagram': {
      let handle = trimmed;
      if (handle.includes('instagram.com/')) {
        const match = handle.match(/instagram\.com\/(@?[\w.]+)/);
        handle = match?.[1] ?? handle;
      }
      handle = handle.replace(/^@/, '');
      if (!/^[a-zA-Z0-9_.]{1,30}$/.test(handle)) {
        return { valid: false, handle, error: 'Invalid Instagram handle' };
      }
      return { valid: true, handle };
    }
    case 'youtube': {
      let handle = trimmed;
      // Accept full URLs, @handles, or channel IDs
      if (handle.includes('youtube.com/')) {
        const match = handle.match(/youtube\.com\/(?:@|channel\/|c\/)?([^/?&]+)/);
        handle = match?.[1] ?? handle;
      }
      handle = handle.replace(/^@/, '');
      if (!handle) {
        return { valid: false, handle, error: 'Invalid YouTube channel' };
      }
      return { valid: true, handle };
    }
  }
}

export function buildApifyConfig(platform: SocialPlatform, handle: string, maxItems = platform === 'youtube' ? 20 : 5): ApifyConfig {
  const actorId = APIFY_ACTORS[platform];

  switch (platform) {
    case 'twitter':
      return {
        actor_id: actorId,
        actor_input: { handles: [handle], maxTweets: maxItems },
      };
    case 'instagram':
      return {
        actor_id: actorId,
        actor_input: { usernames: [handle], resultsLimit: maxItems },
      };
    case 'youtube':
      // If it looks like a channel ID, use channelUrls; otherwise use handle search
      const isChannelId = handle.startsWith('UC') && handle.length === 24;
      return {
        actor_id: actorId,
        actor_input: isChannelId
          ? { channelUrls: [`https://youtube.com/channel/${handle}`], maxResults: maxItems }
          : { channelUrls: [`https://youtube.com/@${handle}`], maxResults: maxItems },
      };
  }
}
