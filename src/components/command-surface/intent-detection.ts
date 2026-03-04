import type { CommandMode, IntentType } from './types';

export const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  create_project: [/create project/i, /new project/i, /start project/i, /project called/i, /launch project/i],
  create_task: [/create task/i, /add task/i, /new task/i, /fix.*bug/i, /implement/i],
  create_cron: [/schedule/i, /cron/i, /daily.*email/i, /weekly.*report/i, /every.*day/i, /every.*hour/i],
  send_email: [/send email/i, /email.*to/i, /notify/i, /remind.*me/i],
  fix_issue: [/fix/i, /debug/i, /solve/i, /resolve/i, /error/i, /bug/i, /hydration/i],
  architect_feature: [/architect/i, /design/i, /plan.*feature/i, /build.*system/i],
  monitor_system: [/monitor/i, /check.*health/i, /watch/i, /alert/i],
  schedule_reminder: [/remind/i, /schedule/i, /set.*reminder/i],
  unknown: []
};

export function detectIntent(prompt: string): { intent: IntentType; confidence: number } {
  let bestIntent: IntentType = 'unknown';
  let bestScore = 0;

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'unknown') continue;

    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as IntentType;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.3 + (bestScore * 0.2), 0.95) : 0.1;

  return { intent: bestIntent, confidence };
}

export function determineMode(intent: IntentType, prompt: string): CommandMode {
  if (/\b(CTO|architect|implement|build|code|develop)\b/i.test(prompt)) return 'cto';
  if (/\b(COO|schedule|email|notify|monitor|operate|run)\b/i.test(prompt)) return 'coo';

  switch (intent) {
    case 'create_task':
    case 'create_project':
    case 'fix_issue':
    case 'architect_feature':
      return 'cto';
    case 'create_cron':
    case 'send_email':
    case 'monitor_system':
    case 'schedule_reminder':
      return 'coo';
    default:
      return 'auto';
  }
}
