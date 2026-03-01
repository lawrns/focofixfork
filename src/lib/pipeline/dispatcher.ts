/**
 * Pipeline dispatcher — sends plan/execute/review phases to ClawdBot.
 * All model calls go through ClawdBot; model names are routing hints only.
 */

import { dispatchToClawdBot } from '@/lib/delegation/dispatchers'

export const PIPELINE_PROMPTS = {
  plan: `You are a senior software architect. Analyze the engineering task and produce a detailed plan.
Output ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
{
  "summary": "one-sentence summary",
  "steps": ["step 1", "step 2"],
  "files_to_modify": ["src/app/..."],
  "risks": ["risk 1"],
  "db_implications": ["implication or empty array"],
  "validation_strategy": "how to verify this works",
  "estimated_complexity": "low|medium|high"
}`,

  execute: `You are an expert software engineer. Given the plan and task, produce concrete code patches.
Output ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
{
  "summary": "what was implemented",
  "patches": [
    { "file": "src/...", "diff": "unified diff or full file content", "description": "what changed" }
  ],
  "commands_suggested": ["npm install ...", "npx ..."],
  "warnings": ["any caveats"],
  "notes": "implementation notes"
}`,

  review: `You are a principal code reviewer with expertise in security, performance, and architecture.
Review the plan, execution patches, and task context. Extract reusable lessons for the handbook.
Output ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
{
  "summary": "overall assessment",
  "critical_issues": ["issue or empty array"],
  "risks": ["risk or empty array"],
  "improvements": ["suggestion"],
  "performance": ["observation"],
  "security": ["observation"],
  "db_observations": ["observation or empty array"],
  "suggested_patches": [{ "file": "src/...", "change": "description of change" }],
  "handbook_additions": [
    {
      "pattern": "Pattern name",
      "lesson": "What to do or avoid",
      "applicable_to": "domain/file type this applies to"
    }
  ],
  "confidence_score": 85
}`,
} as const

export { type PipelinePhase } from './types'

// Determine the callback URL for ClawdBot to POST results back
function getCallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? 'http://127.0.0.1:3000'
  const normalized = base.startsWith('http') ? base : `https://${base}`
  return `${normalized}/api/pipeline/callback`
}

export async function dispatchPipelinePhase(options: {
  pipelineRunId: string
  phase: 'plan' | 'execute' | 'review'
  preferredModel: string
  taskDescription: string
  context: string
}): Promise<string> {
  const { pipelineRunId, phase, preferredModel, taskDescription, context } = options

  const systemPrompt = PIPELINE_PROMPTS[phase]

  // Embed pipeline routing metadata into the task ID so ClawdBot callback
  // can route back via the callback endpoint.
  const taskId = `pipeline:${pipelineRunId}:${phase}`

  const result = await dispatchToClawdBot({
    taskId,
    title: `[Pipeline:${phase.toUpperCase()}] ${taskDescription.slice(0, 120)}`,
    description: context,
    projectContext: '',
    featureContext: '',
    systemPrompt: `${systemPrompt}\n\n# Preferred Model\n${preferredModel}\n\n# Pipeline Run ID\n${pipelineRunId}\n\n# Phase\n${phase}`,
    agentId: `pipeline-${phase}`,
    callbackUrl: getCallbackUrl(),
  })

  if (!result.success) {
    throw new Error(result.error ?? 'ClawdBot dispatch failed')
  }

  return result.externalRunId ?? taskId
}
