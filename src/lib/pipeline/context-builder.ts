/**
 * Context builder for pipeline phases.
 * Assembles the context string passed to each ClawdBot dispatch.
 */

import type { PlanResult, ExecutionResult } from './types'
import { formatPlanningInputs, type PlanningInputs } from './agent-planning'

export function buildPlanContext(taskDescription: string, options: PlanningInputs = {}): string {
  const planningInputs = formatPlanningInputs(options)

  return `# User Request

${taskDescription}

# Instructions
Analyze this request carefully. Consider the codebase patterns (Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase). The plan must be globally reusable, coherent across different agent types, and implementation-ready.

${planningInputs}`
}

export function buildExecuteContext(
  taskDescription: string,
  planResult: PlanResult
): string {
  return `# Engineering Task

${taskDescription}

# Approved Plan

${JSON.stringify(planResult, null, 2)}

# Instructions
Implement the plan. Produce unified diffs or complete file contents for each file that needs to change. Follow the existing code patterns (Next.js App Router, TypeScript, Tailwind, shadcn/ui components). Do not introduce new dependencies unless absolutely necessary.`
}

export function buildReviewContext(
  taskDescription: string,
  planResult: PlanResult,
  executionResult: ExecutionResult,
  migrationFiles?: string[]
): string {
  const migrationContext = migrationFiles?.length
    ? `\n# Existing Migrations\n${migrationFiles.join('\n')}`
    : ''

  return `# Engineering Task

${taskDescription}

# Plan

${JSON.stringify(planResult, null, 2)}

# Execution (Patches)

${JSON.stringify(executionResult, null, 2)}
${migrationContext}

# Instructions
Review the plan and execution patches thoroughly. Identify critical issues, security vulnerabilities, performance problems, and areas for improvement. Extract reusable patterns and lessons into handbook_additions so future agents can learn from this review. Be specific and actionable.`
}
