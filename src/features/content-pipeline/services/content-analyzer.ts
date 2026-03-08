/**
 * Content Analyzer Service
 * Uses ClawdBot to derive upgrade signals from inbound social content.
 */

import type { ContentItem, AnalysisResult, UpgradeSignal } from '../types';
import { dispatchToClawdBot } from '@/lib/delegation/dispatchers';
import { OpenAIService } from '@/lib/services/openai';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const ANALYSIS_SYSTEM_PROMPT = `You are an upgrade-intelligence analyst. Analyze the provided social content and return a JSON object with the following structure:
{
  "summary": "A concise operational finding in 1-2 sentences",
  "tags": ["tag1", "tag2", "tag3"],
  "themes": ["theme1", "theme2"],
  "relevanceScore": 0.85,
  "signalType": "workflow-friction | unmet-need | competitor-move | product-gap | demand-signal | adoption-pattern",
  "confidence": 0.78,
  "urgency": "monitor | active | urgent",
  "affectedArea": "The product or workflow area affected",
  "upgradeImplication": "The upgrade or change this evidence suggests",
  "evidenceExcerpt": "A short quote or paraphrase grounded in the source"
}

Guidelines:
- Optimize for decisions that help product or operational upgrades
- Use transcript and caption evidence when available
- Tags and themes should be lowercase, concise, and useful for clustering
- Relevance score should favor actionability, specificity, and leverage for upgrades
- Confidence must be between 0 and 1
- If evidence is weak, lower confidence and urgency instead of inventing certainty
- Return ONLY the JSON object, no markdown formatting or additional text`;

function normalizeSignalPayload(analysis: AnalysisResult): UpgradeSignal {
  const urgency = analysis.urgency ?? analysis.payload?.urgency ?? 'monitor';
  const confidence = Math.max(0, Math.min(1, analysis.confidence ?? analysis.payload?.confidence ?? analysis.relevanceScore ?? 0.5));
  const tags = Array.from(new Set((analysis.tags ?? analysis.payload?.tags ?? []).filter(Boolean)));
  const themes = Array.from(new Set((analysis.themes ?? analysis.payload?.themes ?? tags).filter(Boolean)));

  return {
    summary: analysis.summary,
    signal_type: analysis.signalType ?? analysis.payload?.signal_type ?? 'demand-signal',
    confidence,
    urgency,
    affected_area: analysis.affectedArea ?? analysis.payload?.affected_area ?? 'general',
    upgrade_implication: analysis.upgradeImplication ?? analysis.payload?.upgrade_implication ?? analysis.summary,
    evidence_excerpt: analysis.evidenceExcerpt ?? analysis.payload?.evidence_excerpt ?? '',
    themes,
    tags,
  };
}

function extractJsonObject(input: string): string {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function normalizeOpenAIAnalysis(raw: Record<string, unknown>): AnalysisResult {
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  const themes = Array.isArray(raw.themes) ? raw.themes.filter((theme): theme is string => typeof theme === 'string') : [];
  const relevanceScore = typeof raw.relevanceScore === 'number'
    ? raw.relevanceScore
    : typeof raw.relevance_score === 'number'
      ? raw.relevance_score
      : 0.5;

  return {
    summary: typeof raw.summary === 'string' ? raw.summary : 'Upgrade signal identified',
    tags,
    themes,
    relevanceScore,
    signalType: typeof raw.signalType === 'string'
      ? raw.signalType
      : typeof raw.signal_type === 'string'
        ? raw.signal_type
        : 'demand-signal',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.5,
    urgency: raw.urgency === 'active' || raw.urgency === 'urgent' ? raw.urgency : 'monitor',
    affectedArea: typeof raw.affectedArea === 'string'
      ? raw.affectedArea
      : typeof raw.affected_area === 'string'
        ? raw.affected_area
        : 'general',
    upgradeImplication: typeof raw.upgradeImplication === 'string'
      ? raw.upgradeImplication
      : typeof raw.upgrade_implication === 'string'
        ? raw.upgrade_implication
        : (typeof raw.summary === 'string' ? raw.summary : 'Review source item'),
    evidenceExcerpt: typeof raw.evidenceExcerpt === 'string'
      ? raw.evidenceExcerpt
      : typeof raw.evidence_excerpt === 'string'
        ? raw.evidence_excerpt
        : '',
  };
}

async function analyzeWithOpenAI(item: ContentItem): Promise<AnalysisResult> {
  const ai = new OpenAIService({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini',
    chatModel: process.env.NEXT_PUBLIC_OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  });

  const response = await ai.generate({
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    prompt: (item.analysis_text || item.transcript_text || item.raw_content).substring(0, 8000),
    temperature: 0.1,
    maxTokens: 1200,
  });

  const payload = JSON.parse(extractJsonObject(response.content)) as Record<string, unknown>;
  return normalizeOpenAIAnalysis(payload);
}

export class ContentAnalyzer {
  /**
   * Analyze a single content item using ClawdBot
   */
  static async analyzeItem(item: ContentItem): Promise<AnalysisResult | null> {
    try {
      logger.info(`Analyzing content item: ${item.id}`);

      if (supabaseAdmin) {
        await supabaseAdmin
          .from('content_items')
          .update({
            analysis_status: 'processing',
            analysis_error: null,
          })
          .eq('id', item.id);
      }

      const shouldUseDirectOpenAI =
        Boolean(process.env.OPENAI_API_KEY) &&
        (!process.env.ANTHROPIC_API_KEY || process.env.HIVE_ANALYSIS_PROVIDER === 'openai');

      if (shouldUseDirectOpenAI) {
        const analysis = await analyzeWithOpenAI(item);
        await this.processAnalysisResult(item.id, analysis);
        return analysis;
      }

      const result = await dispatchToClawdBot({
        taskId: `content-analysis-${item.id}`,
        title: `Analyze Content: ${item.title || 'Untitled'}`,
        description: (item.analysis_text || item.transcript_text || item.raw_content).substring(0, 8000), // Limit content length
        projectContext: 'Hive social upgrade intelligence',
        featureContext: 'Analyze social content to derive product, workflow, and market upgrade signals with evidence and urgency',
        systemPrompt: ANALYSIS_SYSTEM_PROMPT,
        agentId: 'clawd-analyzer',
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/content-pipeline/analysis-callback`,
      });

      if (!result.success) {
        logger.error(`Analysis failed for item ${item.id}:`, result.error);
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('content_items')
            .update({
              analysis_status: 'failed',
              analysis_error: result.error ?? 'Dispatch failed',
            })
            .eq('id', item.id);
        }
        return null;
      }

      logger.info(`Analysis dispatched for item ${item.id}, externalRunId: ${result.externalRunId}`);

      if (supabaseAdmin) {
        await supabaseAdmin
          .from('content_items')
          .update({
            analysis_status: 'processing',
            analysis_run_id: result.externalRunId ?? null,
            analysis_error: null,
          })
          .eq('id', item.id);
      }

      return {
        summary: item.ai_summary ?? item.title ?? 'Queued for analysis',
        tags: item.ai_tags ?? [],
        relevanceScore: item.relevance_score ?? 0,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error analyzing item ${item.id}:`, errorMsg);
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('content_items')
          .update({
            analysis_status: 'failed',
            analysis_error: errorMsg,
          })
          .eq('id', item.id);
      }
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
      const payload = normalizeSignalPayload(analysis);
      const { error } = await supabaseAdmin
        .from('content_items')
        .update({
          ai_summary: analysis.summary,
          ai_tags: payload.tags,
          relevance_score: analysis.relevanceScore,
          analysis_status: 'complete',
          analysis_error: null,
          signal_type: payload.signal_type,
          signal_confidence: payload.confidence,
          signal_urgency: payload.urgency,
          upgrade_implication: payload.upgrade_implication,
          evidence_excerpt: payload.evidence_excerpt,
          signal_payload: payload,
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
      .or('analysis_status.eq.pending,analysis_status.eq.failed,and(ai_summary.is.null,analysis_status.is.null)')
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
