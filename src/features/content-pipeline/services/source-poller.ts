/**
 * Source Poller Service
 * Handles polling RSS feeds and API endpoints for new content
 */

import type { ContentSource, RawContentItem, PollResult } from '../types';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

// Simple XML parser for RSS feeds
// Uses regex-based parsing for lightweight operation without external deps
function parseXML(xml: string): any {
  const parser = {
    getElementsByTagName: (tag: string, xmlStr: string): string[] => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(xmlStr)) !== null) {
        matches.push(match[1].trim());
      }
      return matches;
    },
    getElementText: (tag: string, xmlStr: string): string | undefined => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = regex.exec(xmlStr);
      return match ? match[1].trim() : undefined;
    },
    getAttribute: (attr: string, tag: string, xmlStr: string): string | undefined => {
      const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
      const match = regex.exec(xmlStr);
      return match ? match[1] : undefined;
    },
  };

  return {
    items: parser.getElementsByTagName('item', xml).map(itemXml => ({
      title: parser.getElementText('title', itemXml),
      description: parser.getElementText('description', itemXml),
      content: parser.getElementText('content:encoded', itemXml) || 
               parser.getElementText('content', itemXml) ||
               parser.getElementText('description', itemXml),
      link: parser.getElementText('link', itemXml),
      guid: parser.getElementText('guid', itemXml),
      pubDate: parser.getElementText('pubDate', itemXml),
    })),
    entries: parser.getElementsByTagName('entry', xml).map(entryXml => ({
      title: parser.getElementText('title', entryXml),
      content: parser.getElementText('content', entryXml) ||
               parser.getElementText('summary', entryXml),
      link: parser.getAttribute('href', 'link', entryXml) || parser.getElementText('link', entryXml),
      id: parser.getElementText('id', entryXml),
      published: parser.getElementText('published', entryXml) || parser.getElementText('updated', entryXml),
    })),
  };
}

export class SourcePoller {
  /**
   * Poll a content source for new items
   */
  static async pollSource(source: ContentSource): Promise<PollResult> {
    try {
      logger.info(`Polling source: ${source.name} (${source.type})`);

      let items: RawContentItem[] = [];

      switch (source.type) {
        case 'rss':
          items = await this.pollRSS(source);
          break;
        case 'api':
          items = await this.pollAPI(source);
          break;
        case 'webhook':
          // Webhooks don't poll - they receive pushes
          return { success: true, itemsProcessed: 0, itemsNew: 0 };
        case 'scrape':
          // Scrape requires puppeteer or similar - placeholder
          return { success: false, itemsProcessed: 0, itemsNew: 0, error: 'Scrape not implemented' };
        default:
          return { success: false, itemsProcessed: 0, itemsNew: 0, error: `Unknown source type: ${source.type}` };
      }

      const result = await this.processNewItems(source, items);

      // Update last checked timestamp
      await supabaseAdmin
        .from('content_sources')
        .update({ 
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error polling source ${source.name}:`, errorMsg);

      // Increment error count
      await supabaseAdmin
        .from('content_sources')
        .update({ 
          error_count: source.error_count + 1,
          last_error: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id);

      return { success: false, itemsProcessed: 0, itemsNew: 0, error: errorMsg };
    }
  }

  /**
   * Poll an RSS feed
   */
  private static async pollRSS(source: ContentSource): Promise<RawContentItem[]> {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'FocoContentBot/1.0',
        ...source.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const parsed = parseXML(xml);

    // Handle RSS 2.0 (items) and Atom (entries)
    const rawItems = parsed.items.length > 0 ? parsed.items : parsed.entries;

    return rawItems.map((item: any) => ({
      external_id: item.guid || item.id || item.link || `${Date.now()}-${Math.random()}`,
      title: item.title || 'Untitled',
      content: item.content || item.description || '',
      published_at: item.pubDate || item.published ? new Date(item.pubDate || item.published).toISOString() : undefined,
    }));
  }

  /**
   * Poll a JSON API
   */
  private static async pollAPI(source: ContentSource): Promise<RawContentItem[]> {
    const response = await fetch(source.url, {
      headers: {
        'Accept': 'application/json',
        ...source.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle common API response patterns
    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.results && Array.isArray(data.results)) {
      items = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else {
      // Try to find any array in the response
      const arrays = Object.values(data).filter(v => Array.isArray(v));
      if (arrays.length > 0) {
        items = arrays[0] as any[];
      }
    }

    return items.map((item: any) => ({
      external_id: item.id || item.uuid || item.key || `${Date.now()}-${Math.random()}`,
      title: item.title || item.name || item.subject || 'Untitled',
      content: item.content || item.body || item.text || item.description || JSON.stringify(item),
      published_at: item.created_at || item.published_at || item.date || item.timestamp,
    }));
  }

  /**
   * Process new items and store them in the database
   */
  static async processNewItems(source: ContentSource, items: RawContentItem[]): Promise<PollResult> {
    if (!supabaseAdmin) {
      throw new Error('supabaseAdmin is not available');
    }

    let itemsNew = 0;

    for (const item of items) {
      // Check for duplicates by external_id
      const { data: existing } = await supabaseAdmin
        .from('content_items')
        .select('id')
        .eq('source_id', source.id)
        .eq('external_id', item.external_id)
        .maybeSingle();

      if (existing) {
        continue; // Skip duplicates
      }

      // Insert new item
      const { error } = await supabaseAdmin
        .from('content_items')
        .insert({
          source_id: source.id,
          external_id: item.external_id,
          title: item.title,
          raw_content: item.content,
          published_at: item.published_at,
          status: 'unread',
        });

      if (error) {
        logger.error(`Error inserting content item:`, error);
      } else {
        itemsNew++;
      }
    }

    return {
      success: true,
      itemsProcessed: items.length,
      itemsNew,
    };
  }

  /**
   * Parse RSS XML to items
   */
  static parseRSS(xml: string): RawContentItem[] {
    const parsed = parseXML(xml);
    const rawItems = parsed.items.length > 0 ? parsed.items : parsed.entries;

    return rawItems.map((item: any) => ({
      external_id: item.guid || item.id || item.link || `${Date.now()}-${Math.random()}`,
      title: item.title || 'Untitled',
      content: item.content || item.description || '',
      published_at: item.pubDate || item.published ? new Date(item.pubDate || item.published).toISOString() : undefined,
    }));
  }

  /**
   * Fetch JSON API
   */
  static async fetchAPI(url: string, headers: Record<string, string> = {}): Promise<RawContentItem[]> {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.results && Array.isArray(data.results)) {
      items = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else {
      const arrays = Object.values(data).filter(v => Array.isArray(v));
      if (arrays.length > 0) {
        items = arrays[0] as any[];
      }
    }

    return items.map((item: any) => ({
      external_id: item.id || item.uuid || item.key || `${Date.now()}-${Math.random()}`,
      title: item.title || item.name || item.subject || 'Untitled',
      content: item.content || item.body || item.text || item.description || JSON.stringify(item),
      published_at: item.created_at || item.published_at || item.date || item.timestamp,
    }));
  }
}
