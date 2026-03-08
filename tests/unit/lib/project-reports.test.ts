import { describe, expect, test } from 'vitest'
import { buildProjectReportDocument } from '@/lib/project-reports'

describe('project report document builder', () => {
  test('assembles structured report sections from plan and review outputs', () => {
    const report = buildProjectReportDocument({
      projectId: 'project-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      runId: 'run-1',
      taskDescription: 'Assess the codebase and recommend direction',
      projectName: 'Foco',
      reportType: 'project_health',
      selectedAgentId: 'advisor-1',
      selectedAgentName: 'Taleb',
      planResult: {
        summary: 'Stabilize execution before expanding scope',
        steps: ['Improve tests'],
        files_to_modify: ['src/app/api/example.ts'],
        risks: ['Low observability'],
        db_implications: [],
        validation_strategy: 'Run unit tests',
        estimated_complexity: 'medium',
        consolidated_answer: {
          recommendation: 'Tighten reliability before shipping more surfaces',
          why_this_path_wins: ['Trust improves'],
          points_of_agreement: ['Reliability matters'],
          remaining_disagreements: [],
          uncertainties: [],
          validation_needed: [],
        },
        execution_plan: {
          objective: 'Reduce operational risk',
          recommended_approach: 'Reliability first',
          steps: [],
          risks: [],
          open_questions: ['Which flows fail most?'],
          success_criteria: ['Fewer failures'],
          immediate_next_actions: ['Add audits'],
        },
      },
      reviewResult: {
        summary: 'The repo is promising but under-instrumented.',
        critical_issues: ['Sparse audit artifacts'],
        risks: ['Command outputs are transient'],
        improvements: ['Persist structured reports'],
        performance: [],
        security: [],
        db_observations: [],
        suggested_patches: [],
        handbook_additions: [],
        confidence_score: 84,
      },
    })

    expect(report.title).toBe('Foco Project Health Report')
    expect(report.summary).toContain('under-instrumented')
    expect(report.recommended_direction.next_steps).toContain('Persist structured reports')
    expect(report.current_state.concerns).toContain('Sparse audit artifacts')
  })
})
