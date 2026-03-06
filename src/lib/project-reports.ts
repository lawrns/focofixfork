import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanResult, ReviewReport } from '@/lib/pipeline/types'

interface ProjectReportScope {
  projectId: string
  workspaceId: string
  userId: string
  runId: string
}

interface BuildProjectReportInput extends ProjectReportScope {
  taskDescription: string
  projectName: string
  reportType: string
  selectedAgentId?: string | null
  selectedAgentName?: string | null
  planResult?: PlanResult | null
  reviewResult?: ReviewReport | null
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim())))
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function buildProjectReportDocument(input: BuildProjectReportInput) {
  const summary =
    input.reviewResult?.summary ||
    input.planResult?.summary ||
    `Assessment prepared for ${input.projectName}.`

  const recommendations = uniqueStrings([
    ...(input.reviewResult?.improvements ?? []),
    ...(input.planResult?.execution_plan?.immediate_next_actions ?? []),
    ...(input.planResult?.consolidated_answer?.why_this_path_wins ?? []),
  ])

  const risks = uniqueStrings([
    ...(input.reviewResult?.risks ?? []),
    ...(input.reviewResult?.critical_issues ?? []),
    ...(input.planResult?.risks ?? []),
  ])

  const evidence = {
    plan_summary: input.planResult?.summary ?? null,
    review_summary: input.reviewResult?.summary ?? null,
    files_to_modify: input.planResult?.files_to_modify ?? [],
    validation_strategy: input.planResult?.validation_strategy ?? null,
    confidence_score: input.reviewResult?.confidence_score ?? null,
  }

  return {
    title: `${input.projectName} ${titleCase(input.reportType)} Report`,
    report_type: input.reportType,
    summary,
    executive_summary: summary,
    current_state: {
      strengths: input.planResult?.consolidated_answer?.points_of_agreement ?? [],
      concerns: risks,
      evidence,
    },
    recommended_direction: {
      narrative:
        input.planResult?.consolidated_answer?.recommendation ??
        input.planResult?.execution_plan?.recommended_approach ??
        'Stabilize the highest-risk areas first, then execute the top improvements in a measured order.',
      next_steps: recommendations,
      success_criteria: input.planResult?.execution_plan?.success_criteria ?? [],
    },
    assumptions: input.planResult?.problem_frame?.assumptions ?? [],
    open_questions: input.planResult?.execution_plan?.open_questions ?? [],
    requested_prompt: input.taskDescription,
    agent: {
      id: input.selectedAgentId ?? null,
      name: input.selectedAgentName ?? null,
    },
    generated_at: new Date().toISOString(),
  }
}

export async function persistProjectReport(
  supabase: SupabaseClient,
  input: BuildProjectReportInput
): Promise<{ reportId: string; artifactId: string; title: string }> {
  const report = buildProjectReportDocument(input)

  const { data: reportRow, error: reportError } = await supabase
    .from('reports')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      report_type: input.reportType,
      title: report.title,
      config: {
        source: 'command_center',
        run_id: input.runId,
        selected_agent_id: input.selectedAgentId ?? null,
      },
      data: report,
      generated_by: input.userId,
      is_ai_generated: true,
      created_at: report.generated_at,
    })
    .select('id, title')
    .single()

  if (reportError || !reportRow) {
    throw new Error(reportError?.message ?? 'Failed to create report')
  }

  const { data: artifactRow, error: artifactError } = await supabase
    .from('artifacts')
    .insert({
      run_id: input.runId,
      type: 'project_report',
      uri: `/reports/${reportRow.id}`,
      meta: {
        report_type: input.reportType,
        report_id: reportRow.id,
        project_id: input.projectId,
        workspace_id: input.workspaceId,
      },
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      report_id: reportRow.id,
      artifact_kind: 'project_report',
      title: report.title,
    })
    .select('id')
    .single()

  if (artifactError || !artifactRow) {
    throw new Error(artifactError?.message ?? 'Failed to create report artifact')
  }

  return {
    reportId: reportRow.id,
    artifactId: artifactRow.id,
    title: reportRow.title,
  }
}
