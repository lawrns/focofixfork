import {
  Bot,
  FileText,
  Layers3,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type { AIUseCase, ToolMode } from '@/lib/ai/policy'
import { MODEL_CATALOG } from '@/lib/ai/model-catalog'

export const PROVIDER_OPTIONS = [
  { value: 'glm', label: 'GLM / Z.AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic / Claude' },
  { value: 'deepseek', label: 'DeepSeek' },
] as const

export { MODEL_CATALOG }

export const TOOL_MODE_OPTIONS: Array<{ value: ToolMode; label: string; description: string }> = [
  { value: 'none', label: 'No tools', description: 'Pure text generation only.' },
  { value: 'llm_tools_only', label: 'LLM tools', description: 'Allow structured app tools only.' },
  { value: 'surfaces_only', label: 'Action surfaces', description: 'Allow browser/API/file surfaces only.' },
  { value: 'llm_tools_and_surfaces', label: 'Tools + surfaces', description: 'Full capability set.' },
]

export const TOOL_OPTIONS = [
  { id: 'query_tasks', name: 'Query Tasks', description: 'Search tasks with filters.' },
  { id: 'get_task_details', name: 'Get Task Details', description: 'Load a task with context.' },
  { id: 'get_project_overview', name: 'Project Overview', description: 'Summarize project state.' },
  { id: 'get_team_workload', name: 'Team Workload', description: 'Analyze capacity and load.' },
  { id: 'analyze_blockers', name: 'Analyze Blockers', description: 'Find blocked work and dependencies.' },
  { id: 'search_docs', name: 'Search Docs', description: 'Reserved for document search integrations.' },
] as const

export const TASK_PROMPTS = [
  {
    id: 'task_generation',
    title: 'Task Generation',
    description: 'Fallback guidance for creating tasks or subtasks.',
    placeholder: 'Always include acceptance criteria, scope, and success checks.',
  },
  {
    id: 'task_analysis',
    title: 'Task Analysis',
    description: 'Fallback guidance for analyzing tasks and blockers.',
    placeholder: 'Highlight dependencies, ambiguity, and delivery risk first.',
  },
  {
    id: 'prioritization',
    title: 'Prioritization',
    description: 'Fallback guidance for choosing the next best action.',
    placeholder: 'Prefer high-impact work that unblocks multiple teams.',
  },
] as const

export const AUDIT_LEVELS = [
  { value: 'minimal', title: 'Minimal', description: 'Critical failures only.' },
  { value: 'standard', title: 'Standard', description: 'Major AI actions and decisions.' },
  { value: 'full', title: 'Full', description: 'Include prompts, outputs, and reasoning traces.' },
] as const

export const PRIMARY_USE_CASES: Array<{
  id: AIUseCase
  title: string
  description: string
  badge: string
}> = [
  { id: 'task_action', title: 'Task Actions', description: 'Task previews, breakdowns, summaries, and estimates.', badge: 'Operational' },
  { id: 'project_parsing', title: 'Project Parsing', description: 'Natural language project creation and structure extraction.', badge: 'Structured' },
  { id: 'pipeline_plan', title: 'Pipeline Planning', description: 'Planning phase for coding and orchestration pipelines.', badge: 'Core' },
  { id: 'pipeline_execute', title: 'Pipeline Execution', description: 'Execution phase model routing and capabilities.', badge: 'Core' },
  { id: 'pipeline_review', title: 'Pipeline Review', description: 'Review phase model routing and handbook extraction.', badge: 'Core' },
  { id: 'custom_agent_run', title: 'Custom Agent Runs', description: 'Default runtime profile for user-created agents.', badge: 'Agents' },
]

export const ADVANCED_USE_CASES: Array<{
  id: AIUseCase
  title: string
  description: string
  badge: string
}> = [
  { id: 'command_surface_plan', title: 'Command Surface Plan', description: 'Plan phase for the live command surface.', badge: 'Advanced' },
  { id: 'command_surface_execute', title: 'Command Surface Execute', description: 'Execution phase for the live command surface.', badge: 'Advanced' },
  { id: 'command_surface_review', title: 'Command Surface Review', description: 'Review phase for the live command surface.', badge: 'Advanced' },
  { id: 'prompt_optimization', title: 'Prompt Optimization', description: 'Prompt optimizer and prompt-refinement flows.', badge: 'Advanced' },
  { id: 'cofounder_evaluation', title: 'Co-Founder Evaluation', description: 'Autonomy, validation, and decision-evaluation flows.', badge: 'Advanced' },
]

export const CAPABILITY_MATRIX = [
  {
    mode: 'none',
    title: 'Plain reasoning',
    icon: FileText,
    summary: 'Best for prompt-only analysis and low-risk drafting.',
    details: ['No tool calls', 'No browser/API actions', 'Fastest and simplest'],
  },
  {
    mode: 'llm_tools_only',
    title: 'Structured app tools',
    icon: Wrench,
    summary: 'Lets the model query approved workspace data safely.',
    details: ['Uses tool allowlists', 'Good for task/project analysis', 'No external action surfaces'],
  },
  {
    mode: 'surfaces_only',
    title: 'Action surfaces',
    icon: Sparkles,
    summary: 'Routes work into browser/API/file surfaces without LLM tool calls.',
    details: ['Useful for execution agents', 'Best when actions are pre-structured', 'No internal tool schemas'],
  },
  {
    mode: 'llm_tools_and_surfaces',
    title: 'Full capability',
    icon: Bot,
    summary: 'Combines structured reasoning with action-oriented execution.',
    details: ['Highest flexibility', 'Needs strongest approval policy', 'Best for orchestration-heavy flows'],
  },
] as const

export const SUMMARY_ITEMS = [
  { label: 'Customized Use Cases', key: 'customized', icon: Layers3 },
  { label: 'Custom Agents', key: 'agents', icon: Bot },
  { label: 'Default Tool Allowlist', key: 'tools', icon: Wrench },
] as const
