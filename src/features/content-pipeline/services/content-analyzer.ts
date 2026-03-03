/**
 * Content Analyzer Service
 * Uses ClawdBot to analyze content items and generate summaries, tags, and relevance scores
 */

import type { ContentItem, AnalysisResult } from '../types';
import { dispatchToClawdBot } from '@/lib/delegation/dispatchers';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const ANALYSIS_SYSTEM_PROMPT = `You are a content analysis assistant. Analyze the provided content and return a JSON object with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the key points",
  "tags": ["tag1", "tag2", "tag3"], // 3-5 relevant tags
  "relevanceScore": 0.85 // A number between 0 and 1 indicating overall relevance/quality
}

Guidelines:
- Summary should capture the main ideas without fluff
- Tags should be lowercase, single words or short phrases
- Relevance score should consider: informational value, actionability, uniqueness
- Return ONLY the JSON object, no markdown formatting or additional text`;

export class ContentAnalyzer {
  /**
   * Analyze a single content item using ClawdBot
   */
  static async analyzeItem(item: ContentItem): Promise<AnalysisResult | null> {
    try {
      logger.info(`Analyzing content item: ${item.id}`);

      const result = await dispatchToClawdBot({
        taskId: `content-analysis-${item.id}`,
        title: `Analyze Content: ${item.title || 'Untitled'}`,
        description: item.raw_content.substring(0, 8000), // Limit content length
        projectContext: 'Content Pipeline Analysis',
        featureContext: 'Analyzing incoming content from RSS feeds and APIs to extract summaries, tags, and relevance scores',
        systemPrompt: ANALYSIS_SYSTEM_PROMPT,
        agentId: 'clawd-analyzer',
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/content-pipeline/analysis-callback`,
      });

      if (!result.success) {
        logger.error(`Analysis failed for item ${item.id}:`, result.error);
        return null;
      }

      // For now, return a placeholder result since ClawdBot processes asynchronously
      // The callback will handle updating the item with actual results
      logger.info(`Analysis dispatched for item ${item.id}, externalRunId: ${result.externalRunId}`);
      
      return null; // Results will come via callback
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error analyzing item ${item.id}:`, errorMsg);
      return null;
    }
  }

  /**
   * Batch analyze up to 10 items
   */
  static async batchAnalyze(items: ContentItem[]): Promise<{ processed: number; failed: number }> {
    const batch = items.slice(0, 10); // Limit to 10 items
    let processed = 0;
    let failed = 0;

    for (const item of batch) {
      const result = await this.analyzeItem(item);
      if (result) {
        processed++;
      } else {
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Process analysis results from ClawdBot callback
   */
  static async processAnalysisResult(
    itemId: string, 
    analysis: AnalysisResult
  ): Promise<boolean> {
    if (!supabaseAdmin) {
      logger.error('supabaseAdmin is not available');
      return false;
    }

    try {
      const { error } = await supabaseAdmin
        .from('content_items')
        .update({
          ai_summary: analysis.summary,
          ai_tags: analysis.tags,
          relevance_score: analysis.relevanceScore,
          analyzed_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) {
        logger.error(`Error updating analysis result for item ${itemId}:`, error);
        return false;
      }

      logger.info(`Analysis result saved for item ${itemId}`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error processing analysis result for item ${itemId}:`, errorMsg);
      return false;
    }
  }

  /**
   * Get unanalyzed items for processing
   */
  static async getUnanalyzedItems(limit: number = 10): Promise<ContentItem[]> {
    if (!supabaseAdmin) {
      logger.error('supabaseAdmin is not available');
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('content_items')
      .select('*')
      .is('ai_summary', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching unanalyzed items:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Trigger analysis for all unanalyzed items
   */
  static async analyzeAllPending(): Promise<{ processed: number; failed: number }> {
    const items = await this.getUnanalyzedItems(50);
    
    if (items.length === 0) {
      return { processed: 0, failed: 0 };
    }

    logger.info(`Found ${items.length} unanalyzed items`);

    // Process in batches of 10
    let totalProcessed = 0;
    let totalFailed = 0;

    for (let i = 0; i < items.length; i += 10) {
      const batch = items.slice(i, i + 10);
      const result = await this.batchAnalyze(batch);
      totalProcessed += result.processed;
      totalFailed += result.failed;
      
      // Small delay between batches to avoid overwhelming ClawdBot
      if (i + 10 < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { processed: totalProcessed, failed: totalFailed };
  }
}
