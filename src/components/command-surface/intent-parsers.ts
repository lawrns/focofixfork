export function parseCronSchedule(prompt: string): { name: string; schedule: string; handler: string } | null {
  const dailyMatch = prompt.match(/(?:send|create)?\s*(?:daily|every day).*?(?:at)?\s*(\d+)(?::(\d+))?\s*(am|pm)?/i);
  const weeklyMatch = prompt.match(/(?:send|create)?\s*(?:weekly|every week|every monday|every friday)/i);
  const hourlyMatch = prompt.match(/(?:send|create)?\s*(?:every hour|hourly)/i);

  let schedule = '0 9 * * *';
  let name = 'Daily Summary';
  let handler = 'jobs/daily-summary';

  if (dailyMatch) {
    let hour = parseInt(dailyMatch[1]);
    const minute = dailyMatch[2] ? parseInt(dailyMatch[2]) : 0;
    const ampm = dailyMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    schedule = `${minute} ${hour} * * *`;
    name = `Daily at ${hour}:${minute.toString().padStart(2, '0')}`;

    if (prompt.includes('summary')) {
      handler = 'jobs/daily-summary';
      name = 'Daily Summary Email';
    } else if (prompt.includes('report')) {
      handler = 'jobs/daily-report';
      name = 'Daily Report';
    }
  } else if (weeklyMatch) {
    schedule = '0 9 * * 1';
    name = 'Weekly Report';
    handler = 'jobs/weekly-report';
  } else if (hourlyMatch) {
    schedule = '0 * * * *';
    name = 'Hourly Check';
    handler = 'jobs/hourly-check';
  }

  if (prompt.includes('7am') || prompt.includes('7 am') || prompt.includes('7:00')) {
    schedule = '0 7 * * *';
    name = 'Daily 7AM Summary';
  }

  return { name, schedule, handler };
}

export function parseEmailIntent(prompt: string): { to: string[]; subject: string; body: string } | null {
  const emailMatch = prompt.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const to = emailMatch ? [emailMatch[0]] : ['user@example.com'];

  let subject = 'Notification';
  if (prompt.includes('summary')) subject = 'Daily Summary';
  if (prompt.includes('report')) subject = 'Status Report';
  if (prompt.includes('alert')) subject = 'System Alert';

  const body = `Automated message based on your request: "${prompt}"`;

  return { to, subject, body };
}

export function parseTaskIntent(prompt: string): { title: string; description: string; priority: 'urgent' | 'high' | 'medium' | 'low'; type: string } | null {
  const isTaskLikePrompt = /\b(create|add|new|fix|implement|build|solve|debug|refactor|resolve)\b/i.test(prompt)
  if (!isTaskLikePrompt) return null

  let title = prompt;
  let description = '';
  let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
  let type = 'feature';

  const titleMatch = prompt.match(/(?:create task to|fix|implement|build|solve)\s+(.+?)(?:\.|$)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  if (/urgent|critical|asap|p0|p1/i.test(prompt)) priority = 'urgent';
  else if (/high priority|important/i.test(prompt)) priority = 'high';
  else if (/low priority|minor/i.test(prompt)) priority = 'low';

  if (/bug|error|fix|crash|broken/i.test(prompt)) type = 'bug';
  if (/hydrat/i.test(prompt)) {
    type = 'bug';
    title = title || 'Fix hydration errors';
    description = 'Investigate and resolve React hydration mismatches in the application';
    priority = 'high';
  }

  return { title, description, priority, type };
}

export function parseProjectIntent(prompt: string): { name: string; description: string } {
  const normalized = prompt.trim();
  const nameMatch =
    normalized.match(/(?:create|start|launch|new)\s+project(?:\s+called|\s+named)?\s+["']?([^"'.\n]+)["']?/i) ||
    normalized.match(/project(?:\s+called|\s+named)\s+["']?([^"'.\n]+)["']?/i);
  const extracted = nameMatch?.[1]?.trim();

  const rawName = extracted && extracted.length > 0 ? extracted : normalized;
  const cleanName = rawName
    .replace(/^(create|start|launch|new)\s+project\s*/i, '')
    .trim();
  const safeName = (cleanName || 'New Project').slice(0, 100);

  return {
    name: safeName.charAt(0).toUpperCase() + safeName.slice(1),
    description: `Created from Command Surface prompt: "${prompt.trim()}"`,
  };
}
