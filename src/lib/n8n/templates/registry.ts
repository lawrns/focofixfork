import type { N8nWorkflowTemplate } from './types'

const templates: N8nWorkflowTemplate[] = [
  {
    id: 'stripe_revenue_monitor',
    name: 'Stripe Revenue Monitor',
    description: 'Poll Stripe and log balance snapshots to app events.',
    category: 'ClawFinance',
    owner_agent: 'ClawFinance',
    risk_tier: 'medium',
    trigger_type: 'cron',
    parameters: {
      cron_expression: '*/30 * * * *',
      timezone: 'America/Mexico_City',
      stripe_api_key: 'env:STRIPE_SECRET_KEY',
      app_events_url: 'http://127.0.0.1:4000/api/openclaw/events',
      currency: 'MXN',
    },
    workflow: {
      name: 'Stripe Revenue Monitor',
      nodes: [
        {
          id: 'schedule',
          name: 'Every 30 min',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [240, 260],
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '{{cron_expression}}' }] },
            timezone: '{{timezone}}',
          },
        },
        {
          id: 'stripe_balance',
          name: 'Stripe Balance',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [500, 260],
          parameters: {
            method: 'GET',
            url: 'https://api.stripe.com/v1/balance',
            sendHeaders: true,
            headerParameters: {
              parameters: [{ name: 'Authorization', value: 'Bearer {{stripe_api_key}}' }],
            },
          },
        },
        {
          id: 'log_event',
          name: 'Log Event',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [760, 260],
          parameters: {
            method: 'POST',
            url: '{{app_events_url}}',
            sendBody: true,
            contentType: 'json',
            jsonBody:
              '={{ { type: "n8n.workflow.completed", source: "stripe_revenue_monitor", currency: "{{currency}}", payload: $json } }}',
          },
        },
      ],
      connections: {
        'Every 30 min': {
          main: [[{ node: 'Stripe Balance', type: 'main', index: 0 }]],
        },
        'Stripe Balance': {
          main: [[{ node: 'Log Event', type: 'main', index: 0 }]],
        },
      },
      settings: {},
    },
  },
  {
    id: 'content_pipeline',
    name: 'Content Pipeline - Vigil to Post',
    description: 'Fetch insights, generate draft content, log execution.',
    category: 'ClawMarket',
    owner_agent: 'ClawMarket',
    risk_tier: 'low',
    trigger_type: 'webhook',
    parameters: {
      vigil_url: 'http://127.0.0.1:4000/api/content-pipeline/sources',
      anthropic_api_key: 'env:ANTHROPIC_API_KEY',
      app_events_url: 'http://127.0.0.1:4000/api/openclaw/events',
      model: 'claude-3-5-sonnet-latest',
    },
    workflow: {
      name: 'Content Pipeline - Vigil to Post',
      nodes: [
        {
          id: 'webhook',
          name: 'Vigil Scan Complete',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [220, 260],
          parameters: { path: 'content-pipeline-vigil', httpMethod: 'POST', responseMode: 'onReceived' },
        },
        {
          id: 'fetch',
          name: 'Fetch Latest Insights',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [470, 260],
          parameters: { method: 'GET', url: '{{vigil_url}}' },
        },
        {
          id: 'claude',
          name: 'Claude Generate Content',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [720, 260],
          parameters: {
            method: 'POST',
            url: 'https://api.anthropic.com/v1/messages',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'x-api-key', value: '{{anthropic_api_key}}' },
                { name: 'anthropic-version', value: '2023-06-01' },
              ],
            },
            sendBody: true,
            contentType: 'json',
            jsonBody:
              '={{ { model: "{{model}}", max_tokens: 600, messages: [{ role: "user", content: "Create 3 social posts from this data: " + JSON.stringify($json) }] } }}',
          },
        },
        {
          id: 'log',
          name: 'Log to Audit',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [980, 260],
          parameters: {
            method: 'POST',
            url: '{{app_events_url}}',
            sendBody: true,
            contentType: 'json',
            jsonBody: '={{ { type: "n8n.workflow.completed", source: "content_pipeline", payload: $json } }}',
          },
        },
      ],
      connections: {
        'Vigil Scan Complete': { main: [[{ node: 'Fetch Latest Insights', type: 'main', index: 0 }]] },
        'Fetch Latest Insights': { main: [[{ node: 'Claude Generate Content', type: 'main', index: 0 }]] },
        'Claude Generate Content': { main: [[{ node: 'Log to Audit', type: 'main', index: 0 }]] },
      },
      settings: {},
    },
  },
  {
    id: 'morning_briefing',
    name: 'Morning Briefing Generator',
    description: 'Daily run to aggregate metrics and produce a founder briefing.',
    category: 'ClawdBot',
    owner_agent: 'ClawdBot',
    risk_tier: 'low',
    trigger_type: 'cron',
    parameters: {
      cron_expression: '0 7 * * *',
      timezone: 'America/Chihuahua',
      briefing_source_url: 'http://127.0.0.1:4000/api/content-pipeline/sources',
      anthropic_api_key: 'env:ANTHROPIC_API_KEY',
      app_events_url: 'http://127.0.0.1:4000/api/openclaw/events',
      model: 'claude-3-5-sonnet-latest',
    },
    workflow: {
      name: 'Morning Briefing Generator',
      nodes: [
        {
          id: 'schedule',
          name: '7am Daily',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [220, 260],
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '{{cron_expression}}' }] },
            timezone: '{{timezone}}',
          },
        },
        {
          id: 'fetch',
          name: 'Fetch Sources',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [470, 260],
          parameters: { method: 'GET', url: '{{briefing_source_url}}' },
        },
        {
          id: 'claude',
          name: 'Claude Briefing',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [720, 260],
          parameters: {
            method: 'POST',
            url: 'https://api.anthropic.com/v1/messages',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'x-api-key', value: '{{anthropic_api_key}}' },
                { name: 'anthropic-version', value: '2023-06-01' },
              ],
            },
            sendBody: true,
            contentType: 'json',
            jsonBody:
              '={{ { model: "{{model}}", max_tokens: 800, messages: [{ role: "user", content: "Create a concise morning briefing from this data: " + JSON.stringify($json) }] } }}',
          },
        },
        {
          id: 'log',
          name: 'Log Briefing',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [980, 260],
          parameters: {
            method: 'POST',
            url: '{{app_events_url}}',
            sendBody: true,
            contentType: 'json',
            jsonBody: '={{ { type: "n8n.workflow.completed", source: "morning_briefing", payload: $json } }}',
          },
        },
      ],
      connections: {
        '7am Daily': { main: [[{ node: 'Fetch Sources', type: 'main', index: 0 }]] },
        'Fetch Sources': { main: [[{ node: 'Claude Briefing', type: 'main', index: 0 }]] },
        'Claude Briefing': { main: [[{ node: 'Log Briefing', type: 'main', index: 0 }]] },
      },
      settings: {},
    },
  },
  {
    id: 'error_responder',
    name: 'Error Spike Auto-Responder',
    description: 'Process error webhook, generate diagnosis, and log an actionable record.',
    category: 'ClawDev',
    owner_agent: 'ClawDev',
    risk_tier: 'low',
    trigger_type: 'webhook',
    parameters: {
      sentry_issue_url: 'https://sentry.io/api/0/issues/{{issue_id}}/',
      anthropic_api_key: 'env:ANTHROPIC_API_KEY',
      app_events_url: 'http://127.0.0.1:4000/api/openclaw/events',
      model: 'claude-3-5-sonnet-latest',
      issue_id: 'latest',
    },
    workflow: {
      name: 'Error Spike Auto-Responder',
      nodes: [
        {
          id: 'webhook',
          name: 'Sentry Alert',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [220, 260],
          parameters: { path: 'error-responder', httpMethod: 'POST', responseMode: 'onReceived' },
        },
        {
          id: 'fetch',
          name: 'Fetch Error Details',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [470, 260],
          parameters: { method: 'GET', url: '{{sentry_issue_url}}' },
        },
        {
          id: 'claude',
          name: 'Claude Analyze',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [720, 260],
          parameters: {
            method: 'POST',
            url: 'https://api.anthropic.com/v1/messages',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'x-api-key', value: '{{anthropic_api_key}}' },
                { name: 'anthropic-version', value: '2023-06-01' },
              ],
            },
            sendBody: true,
            contentType: 'json',
            jsonBody:
              '={{ { model: "{{model}}", max_tokens: 700, messages: [{ role: "user", content: "Diagnose the error and propose fix steps: " + JSON.stringify($json) }] } }}',
          },
        },
        {
          id: 'log',
          name: 'Log to Audit',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [980, 260],
          parameters: {
            method: 'POST',
            url: '{{app_events_url}}',
            sendBody: true,
            contentType: 'json',
            jsonBody: '={{ { type: "n8n.workflow.completed", source: "error_responder", payload: $json } }}',
          },
        },
      ],
      connections: {
        'Sentry Alert': { main: [[{ node: 'Fetch Error Details', type: 'main', index: 0 }]] },
        'Fetch Error Details': { main: [[{ node: 'Claude Analyze', type: 'main', index: 0 }]] },
        'Claude Analyze': { main: [[{ node: 'Log to Audit', type: 'main', index: 0 }]] },
      },
      settings: {},
    },
  },
  {
    id: 'lead_scraper',
    name: 'Lead Scraper + Qualifier',
    description: 'Run Apify scrape, enrich with Claude, persist lead intelligence.',
    category: 'ClawMarket',
    owner_agent: 'ClawMarket',
    risk_tier: 'medium',
    trigger_type: 'cron',
    parameters: {
      cron_expression: '0 10 * * 1,3,5',
      timezone: 'America/Mexico_City',
      apify_run_url: 'http://127.0.0.1:4000/api/content-pipeline/apify/run',
      anthropic_api_key: 'env:ANTHROPIC_API_KEY',
      app_events_url: 'http://127.0.0.1:4000/api/openclaw/events',
      vertical: 'restaurants',
      location: 'Chihuahua, Mexico',
      model: 'claude-3-5-sonnet-latest',
    },
    workflow: {
      name: 'Lead Scraper + Qualifier',
      nodes: [
        {
          id: 'schedule',
          name: 'MWF 10am',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [220, 260],
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '{{cron_expression}}' }] },
            timezone: '{{timezone}}',
          },
        },
        {
          id: 'apify',
          name: 'Apify Run Scraper',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [470, 260],
          parameters: {
            method: 'POST',
            url: '{{apify_run_url}}',
            sendBody: true,
            contentType: 'json',
            jsonBody: '={{ { vertical: "{{vertical}}", location: "{{location}}" } }}',
          },
        },
        {
          id: 'claude',
          name: 'Claude Qualify Leads',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [720, 260],
          parameters: {
            method: 'POST',
            url: 'https://api.anthropic.com/v1/messages',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'x-api-key', value: '{{anthropic_api_key}}' },
                { name: 'anthropic-version', value: '2023-06-01' },
              ],
            },
            sendBody: true,
            contentType: 'json',
            jsonBody:
              '={{ { model: "{{model}}", max_tokens: 700, messages: [{ role: "user", content: "Score and prioritize these leads: " + JSON.stringify($json) }] } }}',
          },
        },
        {
          id: 'log',
          name: 'Store in Empire DB',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [980, 260],
          parameters: {
            method: 'POST',
            url: '{{app_events_url}}',
            sendBody: true,
            contentType: 'json',
            jsonBody: '={{ { type: "n8n.workflow.completed", source: "lead_scraper", payload: $json } }}',
          },
        },
      ],
      connections: {
        'MWF 10am': { main: [[{ node: 'Apify Run Scraper', type: 'main', index: 0 }]] },
        'Apify Run Scraper': { main: [[{ node: 'Claude Qualify Leads', type: 'main', index: 0 }]] },
        'Claude Qualify Leads': { main: [[{ node: 'Store in Empire DB', type: 'main', index: 0 }]] },
      },
      settings: {},
    },
  },
  {
    id: 'churn_prevention',
    name: 'Churn Prevention Agent',
    description: 'Detect churn-risk users, draft intervention, and log outcomes.',
    category: 'ClawSupport',
    owner_agent: 'ClawSupport',
    risk_tier: 'medium',
    trigger_type: 'cron',
    parameters: {
      cron_expression: '0 9 * * *',
      timezone: 'America/Mexico_City',
      churn_source_url: 'http://127.0.0.1:4000/api/empire/analytics/churn-risk',
      anthropic_api_key: 'env:ANTHROPIC_API_KEY',
      app_events_url: 'http://127.0.0.1:4000/api/openclaw/events',
      model: 'claude-3-5-sonnet-latest',
    },
    workflow: {
      name: 'Churn Prevention Agent',
      nodes: [
        {
          id: 'schedule',
          name: 'Daily 9am',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [220, 260],
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '{{cron_expression}}' }] },
            timezone: '{{timezone}}',
          },
        },
        {
          id: 'query',
          name: 'Query Inactive Users',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [470, 260],
          parameters: { method: 'GET', url: '{{churn_source_url}}' },
        },
        {
          id: 'claude',
          name: 'Claude Draft Retention Email',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [720, 260],
          parameters: {
            method: 'POST',
            url: 'https://api.anthropic.com/v1/messages',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'x-api-key', value: '{{anthropic_api_key}}' },
                { name: 'anthropic-version', value: '2023-06-01' },
              ],
            },
            sendBody: true,
            contentType: 'json',
            jsonBody:
              '={{ { model: "{{model}}", max_tokens: 600, messages: [{ role: "user", content: "Draft a retention message for these users: " + JSON.stringify($json) }] } }}',
          },
        },
        {
          id: 'log',
          name: 'Log to Audit',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [980, 260],
          parameters: {
            method: 'POST',
            url: '{{app_events_url}}',
            sendBody: true,
            contentType: 'json',
            jsonBody: '={{ { type: "n8n.workflow.completed", source: "churn_prevention", payload: $json } }}',
          },
        },
      ],
      connections: {
        'Daily 9am': { main: [[{ node: 'Query Inactive Users', type: 'main', index: 0 }]] },
        'Query Inactive Users': { main: [[{ node: 'Claude Draft Retention Email', type: 'main', index: 0 }]] },
        'Claude Draft Retention Email': { main: [[{ node: 'Log to Audit', type: 'main', index: 0 }]] },
      },
      settings: {},
    },
  },
]

export function listWorkflowTemplates(): N8nWorkflowTemplate[] {
  return templates
}

export function getWorkflowTemplateById(id: string): N8nWorkflowTemplate | null {
  return templates.find((t) => t.id === id) ?? null
}
