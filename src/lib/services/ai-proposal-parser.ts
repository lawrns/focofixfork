/**
 * AI Proposal Parser Service
 *
 * Production-ready service for parsing raw input (voice transcripts, text, files) into structured
 * proposal items using OpenAI's GPT-4. Handles task extraction, duration estimation, team assignment,
 * and what-if scenario planning with high-quality prompts and comprehensive error handling.
 */

import { aiService } from './ai-service'
import type {
  WorkItem,
  WorkItemType,
  WorkItemStatus,
  PriorityLevel,
  WorkspaceMember,
  User
} from '@/types/foco'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ProjectContext {
  id: string
  name: string
  description?: string
  teamSize?: number
  currentWorkload?: number
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  domain?: string
  techStack?: string[]
}

export interface TaskDescription {
  title: string
  description?: string
  type?: WorkItemType
  requiredSkills?: string[]
  complexity?: 'simple' | 'moderate' | 'complex' | 'very_complex'
  dependencies?: string[]
}

export interface TeamMember {
  id: string
  name: string
  email?: string
  role: string
  skills: string[]
  availabilityHoursPerWeek: number
  currentWorkloadHours: number
  timezone?: string
  performanceHistory?: {
    averageTaskCompletionTime: number
    taskCompletionRate: number
  }
}

export interface Workload {
  memberId: string
  currentTaskCount: number
  currentHours: number
  capacityHours: number
  upcomingDeadlines: Date[]
  utilizationPercentage: number
}

export interface TaskHistory {
  taskId: string
  title: string
  type: WorkItemType
  estimatedHours: number
  actualHours: number
  complexity: string
  completedBy: string
  completedAt: string
}

// Parsed output structures
export interface ProposalItem {
  type: 'task' | 'milestone' | 'dependency' | 'note'
  title: string
  description?: string
  itemType?: WorkItemType
  status?: WorkItemStatus
  priority?: PriorityLevel
  estimatedHours?: number
  dueDate?: string
  assigneeId?: string
  dependencies?: string[]
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface ParsedProposal {
  summary: string
  confidence: number
  items: ProposalItem[]
  suggestedMilestones?: {
    name: string
    description: string
    dueDate: string
    tasks: number[]
  }[]
  totalEstimatedHours?: number
  suggestedPriority?: PriorityLevel
  risks?: string[]
  assumptions?: string[]
}

export interface AIEstimate {
  estimatedHours: number
  confidenceLevel: number
  confidenceRange: {
    min: number
    max: number
  }
  reasoning: string
  assumptions: string[]
  riskFactors?: string[]
  comparableTasks?: {
    taskId: string
    title: string
    similarity: number
    actualHours: number
  }[]
}

export interface AIAssignment {
  recommendedAssignee: {
    memberId: string
    name: string
    score: number
    reasoning: string
  }
  alternatives: {
    memberId: string
    name: string
    score: number
    reasoning: string
  }[]
  considerations: {
    workloadBalance: string
    skillMatch: string
    availability: string
    riskFactors?: string[]
  }
}

export interface Assumptions {
  teamAvailability?: number
  workingHoursPerDay?: number
  complexityMultiplier?: number
  bufferPercentage?: number
  priorityAdjustment?: 'increase' | 'decrease' | 'maintain'
  reassignOverloaded?: boolean
  parallelizationFactor?: number
}

export interface RecalculatedProposal {
  originalTotalHours: number
  newTotalHours: number
  originalDuration: number
  newDuration: number
  modifiedItems: ProposalItem[]
  reassignments?: {
    itemTitle: string
    previousAssignee?: string
    newAssignee: string
    reason: string
  }[]
  warnings?: string[]
  recommendations?: string[]
}

// ============================================================================
// AI PROPOSAL PARSER SERVICE
// ============================================================================

export class AIProposalParserService {
  /**
   * Parse raw input into structured proposal items
   *
   * Takes unstructured text (voice transcript, email, meeting notes) and extracts
   * actionable tasks, milestones, and dependencies with proper categorization.
   */
  static async parseProposalInput(
    input: string,
    projectContext: ProjectContext
  ): Promise<ParsedProposal> {
    const systemPrompt = `You are an expert project management AI assistant specializing in parsing unstructured project requirements into actionable work items.

Your task is to analyze input text (voice transcripts, emails, meeting notes, etc.) and extract:
- Tasks: Specific actionable work items
- Milestones: Major deliverables or checkpoints
- Dependencies: Relationships between tasks
- Metadata: Priorities, estimates, assignments

Return ONLY a valid JSON object with no additional text or explanations.`

    const userPrompt = `Analyze this project input and extract structured proposal items.

PROJECT CONTEXT:
Name: ${projectContext.name}
${projectContext.description ? `Description: ${projectContext.description}` : ''}
${projectContext.domain ? `Domain: ${projectContext.domain}` : ''}
${projectContext.techStack ? `Tech Stack: ${projectContext.techStack.join(', ')}` : ''}
${projectContext.urgency ? `Urgency: ${projectContext.urgency}` : ''}

INPUT TO PARSE:
${input}

Return a JSON object with this EXACT structure:
{
  "summary": "Brief 1-2 sentence summary of what was discussed",
  "confidence": 0.85,
  "items": [
    {
      "type": "task|milestone|dependency|note",
      "title": "Clear, actionable title (max 100 chars)",
      "description": "Detailed description with context",
      "itemType": "task|bug|feature|milestone",
      "status": "backlog",
      "priority": "low|medium|high|urgent",
      "estimatedHours": 8,
      "dueDate": "YYYY-MM-DD (if mentioned, else null)",
      "assigneeId": "user-id (if mentioned, else null)",
      "dependencies": ["task-title-1", "task-title-2"],
      "tags": ["relevant", "tags"],
      "metadata": {}
    }
  ],
  "suggestedMilestones": [
    {
      "name": "Milestone name",
      "description": "What this milestone represents",
      "dueDate": "YYYY-MM-DD",
      "tasks": [0, 1, 2]
    }
  ],
  "totalEstimatedHours": 40,
  "suggestedPriority": "medium",
  "risks": ["Potential risk 1", "Potential risk 2"],
  "assumptions": ["Assumption 1", "Assumption 2"]
}

PARSING RULES:
1. Extract every actionable item, even if vaguely mentioned
2. Infer task type based on keywords:
   - "fix", "bug", "issue" → bug
   - "add", "implement", "create" → feature
   - "update", "refactor", "improve" → task
   - "release", "launch", "deliver" → milestone
3. Estimate hours conservatively (2-40 range typical)
4. Set priority based on urgency indicators:
   - "ASAP", "urgent", "critical" → urgent
   - "important", "soon" → high
   - "nice to have", "eventually" → low
   - Default → medium
5. Identify dependencies from phrases like:
   - "depends on", "after", "requires", "blocked by"
6. Group related tasks into milestones (3-8 tasks per milestone)
7. Calculate total hours as sum of all estimates
8. List any risks or uncertainties mentioned
9. Document assumptions made during parsing
10. Set confidence based on clarity of input (0.0-1.0)

Be thorough but avoid creating duplicate items. Preserve user intent.

Return ONLY valid JSON, no markdown formatting.`

    try {
      const response = await aiService.generate({
        prompt: userPrompt,
        systemPrompt,
        temperature: 0.3, // Lower temperature for structured extraction
        maxTokens: 3000
      })

      const parsed = this.extractJSON<ParsedProposal>(response.content)

      return this.validateParsedProposal(parsed)
    } catch (error) {
      console.error('Failed to parse proposal input:', error)
      throw new Error(
        `Proposal parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Estimate task duration with AI-powered analysis
   *
   * Uses historical data when available, falls back to industry benchmarks.
   * Provides confidence intervals and explains reasoning.
   */
  static async estimateTaskDuration(
    task: TaskDescription,
    historicalData?: TaskHistory[]
  ): Promise<AIEstimate> {
    const systemPrompt = `You are an expert software engineering estimator with deep knowledge of development timelines, complexity analysis, and historical task data.

Your task is to provide accurate time estimates with confidence intervals and detailed reasoning.

Return ONLY a valid JSON object with no additional text.`

    const hasHistoricalData = historicalData && historicalData.length > 0
    const historicalContext = hasHistoricalData
      ? `\n\nHISTORICAL DATA (similar tasks):\n${JSON.stringify(historicalData, null, 2)}`
      : ''

    const userPrompt = `Estimate the duration for this task with confidence analysis.

TASK DETAILS:
Title: ${task.title}
${task.description ? `Description: ${task.description}` : ''}
Type: ${task.type || 'task'}
${task.complexity ? `Complexity: ${task.complexity}` : ''}
${task.requiredSkills ? `Required Skills: ${task.requiredSkills.join(', ')}` : ''}
${task.dependencies ? `Dependencies: ${task.dependencies.join(', ')}` : ''}${historicalContext}

Return a JSON object with this EXACT structure:
{
  "estimatedHours": 16,
  "confidenceLevel": 0.75,
  "confidenceRange": {
    "min": 12,
    "max": 24
  },
  "reasoning": "Detailed explanation of the estimate including complexity factors, similar past tasks, and assumptions",
  "assumptions": [
    "Developer has experience with required technologies",
    "No major blockers or dependencies",
    "Standard working conditions"
  ],
  "riskFactors": [
    "New technology might require learning time",
    "Integration complexity unknown"
  ],
  "comparableTasks": [
    {
      "taskId": "historical-task-id",
      "title": "Similar task title",
      "similarity": 0.85,
      "actualHours": 14
    }
  ]
}

ESTIMATION RULES:
1. Analyze task complexity based on:
   - Technical difficulty
   - Required skills and expertise
   - Integration points
   - Testing requirements
   - Documentation needs

2. Complexity multipliers:
   - Simple: 2-8 hours (CRUD operations, UI updates)
   - Moderate: 8-24 hours (feature implementation, API integration)
   - Complex: 24-80 hours (architecture changes, new systems)
   - Very Complex: 80+ hours (platform rewrites, major migrations)

3. If historical data exists:
   - Find similar tasks (analyze title, type, complexity)
   - Weight estimates by similarity score (0.0-1.0)
   - Adjust for team/context differences

4. Confidence level guidelines:
   - 0.9+: Very similar historical tasks, clear requirements
   - 0.7-0.9: Some historical data, well-defined scope
   - 0.5-0.7: Limited data, moderate uncertainty
   - <0.5: High uncertainty, novel tasks

5. Confidence range should be:
   - Narrow (±20%) for high confidence
   - Wide (±50%) for low confidence

6. List all assumptions made
7. Identify risk factors that could increase duration
8. Include comparable tasks if historical data provided

Be realistic and conservative. Better to overestimate than underestimate.

Return ONLY valid JSON, no markdown formatting.`

    try {
      const response = await aiService.generate({
        prompt: userPrompt,
        systemPrompt,
        temperature: 0.4,
        maxTokens: 1500
      })

      const estimate = this.extractJSON<AIEstimate>(response.content)

      return this.validateEstimate(estimate)
    } catch (error) {
      console.error('Failed to estimate task duration:', error)
      throw new Error(
        `Task estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Suggest optimal task assignment based on team skills and availability
   *
   * Analyzes team member capabilities, current workload, and task requirements
   * to recommend the best assignee with alternatives.
   */
  static async suggestAssignment(
    task: TaskDescription,
    teamMembers: TeamMember[],
    workloads: Workload[]
  ): Promise<AIAssignment> {
    const systemPrompt = `You are an expert resource manager and team optimization specialist.

Your task is to analyze task requirements and team capabilities to recommend optimal assignments that balance:
- Skill match and expertise
- Workload distribution
- Availability and capacity
- Performance history

Return ONLY a valid JSON object with no additional text.`

    const teamContext = teamMembers.map((member, idx) => {
      const workload = workloads.find(w => w.memberId === member.id)
      return {
        id: member.id,
        name: member.name,
        role: member.role,
        skills: member.skills,
        availabilityHours: member.availabilityHoursPerWeek,
        currentWorkload: member.currentWorkloadHours,
        utilization: workload?.utilizationPercentage || 0,
        timezone: member.timezone,
        performance: member.performanceHistory
      }
    })

    const userPrompt = `Recommend the best team member to assign this task to.

TASK DETAILS:
Title: ${task.title}
${task.description ? `Description: ${task.description}` : ''}
Type: ${task.type || 'task'}
${task.complexity ? `Complexity: ${task.complexity}` : ''}
${task.requiredSkills ? `Required Skills: ${task.requiredSkills.join(', ')}` : ''}

TEAM MEMBERS:
${JSON.stringify(teamContext, null, 2)}

Return a JSON object with this EXACT structure:
{
  "recommendedAssignee": {
    "memberId": "user-id",
    "name": "Member Name",
    "score": 0.92,
    "reasoning": "Detailed explanation why this is the best choice: skill match, availability, workload balance, and any other relevant factors"
  },
  "alternatives": [
    {
      "memberId": "user-id-2",
      "name": "Alternative Name",
      "score": 0.78,
      "reasoning": "Why this is a good alternative choice"
    }
  ],
  "considerations": {
    "workloadBalance": "Analysis of current team workload distribution and impact of this assignment",
    "skillMatch": "How well the recommended assignee's skills match the task requirements",
    "availability": "Assessment of time availability and capacity to take on this task",
    "riskFactors": [
      "Potential concern 1",
      "Potential concern 2"
    ]
  }
}

ASSIGNMENT SCORING (0.0-1.0):
1. Skill Match (40% weight):
   - Perfect match (has all required skills): +0.40
   - Partial match (has some skills): +0.20
   - Transferable skills (can learn): +0.10
   - No match: 0.00

2. Availability (30% weight):
   - Under 70% utilization: +0.30
   - 70-85% utilization: +0.20
   - 85-95% utilization: +0.10
   - Over 95% utilization: 0.00

3. Performance History (20% weight):
   - High completion rate (>90%): +0.20
   - Good completion rate (70-90%): +0.15
   - Average completion rate (50-70%): +0.10
   - Low completion rate (<50%): +0.05

4. Workload Balance (10% weight):
   - Assignment balances team workload: +0.10
   - Neutral impact: +0.05
   - Increases imbalance: 0.00

DECISION RULES:
1. Never recommend someone at >95% capacity unless no alternatives
2. Prioritize skill match for complex/technical tasks
3. Consider timezone alignment for collaborative work
4. Avoid overloading high performers
5. Provide at least 2 alternatives when possible
6. Explain any concerns or risks in the recommendation
7. Consider complexity vs. experience level match

Be thoughtful about team health and sustainable workload distribution.

Return ONLY valid JSON, no markdown formatting.`

    try {
      const response = await aiService.generate({
        prompt: userPrompt,
        systemPrompt,
        temperature: 0.4,
        maxTokens: 1500
      })

      const assignment = this.extractJSON<AIAssignment>(response.content)

      return this.validateAssignment(assignment, teamMembers)
    } catch (error) {
      console.error('Failed to suggest assignment:', error)
      throw new Error(
        `Assignment suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Recalculate proposal with different assumptions (what-if scenarios)
   *
   * Allows exploration of different planning scenarios by adjusting parameters
   * like team size, working hours, complexity, and priority levels.
   */
  static async recalculateWithAssumptions(
    proposalId: string,
    originalProposal: ParsedProposal,
    assumptions: Assumptions
  ): Promise<RecalculatedProposal> {
    const systemPrompt = `You are an expert project planning analyst specializing in scenario analysis and capacity planning.

Your task is to recalculate project estimates based on changed assumptions and provide impact analysis.

Return ONLY a valid JSON object with no additional text.`

    const userPrompt = `Recalculate this proposal with new assumptions and analyze the impact.

ORIGINAL PROPOSAL:
${JSON.stringify(originalProposal, null, 2)}

NEW ASSUMPTIONS:
${assumptions.teamAvailability !== undefined ? `Team Availability: ${assumptions.teamAvailability}% (vs. 100% baseline)` : ''}
${assumptions.workingHoursPerDay !== undefined ? `Working Hours/Day: ${assumptions.workingHoursPerDay} (vs. 8 hours baseline)` : ''}
${assumptions.complexityMultiplier !== undefined ? `Complexity Multiplier: ${assumptions.complexityMultiplier}x (vs. 1.0x baseline)` : ''}
${assumptions.bufferPercentage !== undefined ? `Buffer Percentage: ${assumptions.bufferPercentage}% added to estimates` : ''}
${assumptions.priorityAdjustment ? `Priority Adjustment: ${assumptions.priorityAdjustment}` : ''}
${assumptions.reassignOverloaded !== undefined ? `Reassign Overloaded: ${assumptions.reassignOverloaded}` : ''}
${assumptions.parallelizationFactor !== undefined ? `Parallelization: ${assumptions.parallelizationFactor}x tasks in parallel` : ''}

Return a JSON object with this EXACT structure:
{
  "originalTotalHours": 120,
  "newTotalHours": 156,
  "originalDuration": 15,
  "newDuration": 12,
  "modifiedItems": [
    {
      "type": "task",
      "title": "Task title",
      "description": "Updated description",
      "estimatedHours": 20,
      "priority": "high",
      "assigneeId": "user-id-or-null"
    }
  ],
  "reassignments": [
    {
      "itemTitle": "Task that was reassigned",
      "previousAssignee": "user-id-1",
      "newAssignee": "user-id-2",
      "reason": "Previous assignee over capacity at 95%"
    }
  ],
  "warnings": [
    "Timeline may be aggressive given reduced team availability",
    "Increased complexity adds risk to estimates"
  ],
  "recommendations": [
    "Consider adding buffer time for complex tasks",
    "Review resource allocation for Q3"
  ]
}

RECALCULATION LOGIC:

1. Adjust Task Hours:
   - Apply complexityMultiplier: hours * multiplier
   - Apply bufferPercentage: hours * (1 + buffer/100)
   - Round to nearest hour

2. Adjust Duration:
   - Calculate total hours / (teamSize * hoursPerDay * availability)
   - Apply parallelizationFactor for parallel-eligible tasks
   - Account for dependencies (sequential tasks)

3. Priority Adjustment:
   - If "increase": move medium→high, low→medium
   - If "decrease": move high→medium, medium→low
   - If "maintain": keep same priorities

4. Reassignments (if reassignOverloaded=true):
   - Identify overloaded assignees
   - Redistribute tasks to available team members
   - Explain reasoning for each reassignment

5. Generate Warnings:
   - Flag aggressive timelines
   - Highlight capacity concerns
   - Note risk factors from assumptions

6. Generate Recommendations:
   - Suggest mitigations for risks
   - Propose optimizations
   - Highlight dependencies to watch

Be realistic about impact. Large assumption changes should have proportional effects.

Return ONLY valid JSON, no markdown formatting.`

    try {
      const response = await aiService.generate({
        prompt: userPrompt,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 2500
      })

      const recalculated = this.extractJSON<RecalculatedProposal>(response.content)

      return this.validateRecalculation(recalculated)
    } catch (error) {
      console.error('Failed to recalculate with assumptions:', error)
      throw new Error(
        `Recalculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Extract JSON from AI response, handling markdown code blocks and text
   */
  private static extractJSON<T>(content: string): T {
    let jsonText = content.trim()

    // Try to extract from markdown code blocks
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    // Remove leading non-JSON text
    const firstBrace = jsonText.indexOf('{')
    if (firstBrace > 0) {
      jsonText = jsonText.substring(firstBrace)
    }

    // Remove trailing non-JSON text
    const lastBrace = jsonText.lastIndexOf('}')
    if (lastBrace < jsonText.length - 1) {
      jsonText = jsonText.substring(0, lastBrace + 1)
    }

    try {
      return JSON.parse(jsonText) as T
    } catch (error) {
      throw new Error(`Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
    }
  }

  /**
   * Validate and sanitize parsed proposal
   */
  private static validateParsedProposal(proposal: any): ParsedProposal {
    if (!proposal.summary || typeof proposal.summary !== 'string') {
      throw new Error('Invalid proposal: missing or invalid summary')
    }

    if (!Array.isArray(proposal.items)) {
      proposal.items = []
    }

    // Validate and clean items
    proposal.items = proposal.items
      .filter((item: any) => item && item.title)
      .map((item: any) => ({
        type: ['task', 'milestone', 'dependency', 'note'].includes(item.type)
          ? item.type
          : 'task',
        title: String(item.title).substring(0, 100),
        description: item.description ? String(item.description) : undefined,
        itemType: ['task', 'bug', 'feature', 'milestone'].includes(item.itemType)
          ? item.itemType
          : 'task',
        status: item.status || 'backlog',
        priority: ['urgent', 'high', 'medium', 'low', 'none'].includes(item.priority)
          ? item.priority
          : 'medium',
        estimatedHours: typeof item.estimatedHours === 'number'
          ? Math.max(0, Math.min(1000, item.estimatedHours))
          : undefined,
        dueDate: item.dueDate || undefined,
        assigneeId: item.assigneeId || undefined,
        dependencies: Array.isArray(item.dependencies) ? item.dependencies : undefined,
        tags: Array.isArray(item.tags) ? item.tags : undefined,
        metadata: item.metadata || {}
      }))

    proposal.confidence = typeof proposal.confidence === 'number'
      ? Math.max(0, Math.min(1, proposal.confidence))
      : 0.5

    proposal.totalEstimatedHours = proposal.items.reduce(
      (sum: number, item: any) => sum + (item.estimatedHours || 0),
      0
    )

    return proposal as ParsedProposal
  }

  /**
   * Validate estimate response
   */
  private static validateEstimate(estimate: any): AIEstimate {
    if (typeof estimate.estimatedHours !== 'number' || estimate.estimatedHours < 0) {
      throw new Error('Invalid estimate: estimatedHours must be a positive number')
    }

    if (typeof estimate.confidenceLevel !== 'number' ||
        estimate.confidenceLevel < 0 ||
        estimate.confidenceLevel > 1) {
      throw new Error('Invalid estimate: confidenceLevel must be between 0 and 1')
    }

    if (!estimate.confidenceRange ||
        typeof estimate.confidenceRange.min !== 'number' ||
        typeof estimate.confidenceRange.max !== 'number') {
      throw new Error('Invalid estimate: confidenceRange must have min and max')
    }

    if (!estimate.reasoning || typeof estimate.reasoning !== 'string') {
      throw new Error('Invalid estimate: reasoning is required')
    }

    estimate.assumptions = Array.isArray(estimate.assumptions) ? estimate.assumptions : []
    estimate.riskFactors = Array.isArray(estimate.riskFactors) ? estimate.riskFactors : []
    estimate.comparableTasks = Array.isArray(estimate.comparableTasks) ? estimate.comparableTasks : []

    return estimate as AIEstimate
  }

  /**
   * Validate assignment response
   */
  private static validateAssignment(assignment: any, teamMembers: TeamMember[]): AIAssignment {
    if (!assignment.recommendedAssignee || !assignment.recommendedAssignee.memberId) {
      throw new Error('Invalid assignment: recommendedAssignee is required')
    }

    const validMemberIds = teamMembers.map(m => m.id)
    if (!validMemberIds.includes(assignment.recommendedAssignee.memberId)) {
      throw new Error('Invalid assignment: recommendedAssignee.memberId not in team')
    }

    if (!Array.isArray(assignment.alternatives)) {
      assignment.alternatives = []
    }

    assignment.alternatives = assignment.alternatives.filter((alt: any) =>
      alt && alt.memberId && validMemberIds.includes(alt.memberId)
    )

    if (!assignment.considerations) {
      assignment.considerations = {
        workloadBalance: 'Not provided',
        skillMatch: 'Not provided',
        availability: 'Not provided'
      }
    }

    return assignment as AIAssignment
  }

  /**
   * Validate recalculation response
   */
  private static validateRecalculation(recalculated: any): RecalculatedProposal {
    if (typeof recalculated.originalTotalHours !== 'number' ||
        typeof recalculated.newTotalHours !== 'number') {
      throw new Error('Invalid recalculation: total hours must be numbers')
    }

    if (!Array.isArray(recalculated.modifiedItems)) {
      throw new Error('Invalid recalculation: modifiedItems must be an array')
    }

    recalculated.reassignments = Array.isArray(recalculated.reassignments)
      ? recalculated.reassignments
      : []

    recalculated.warnings = Array.isArray(recalculated.warnings)
      ? recalculated.warnings
      : []

    recalculated.recommendations = Array.isArray(recalculated.recommendations)
      ? recalculated.recommendations
      : []

    return recalculated as RecalculatedProposal
  }
}

// Export singleton pattern for convenience
export const aiProposalParser = {
  parseProposalInput: AIProposalParserService.parseProposalInput.bind(AIProposalParserService),
  estimateTaskDuration: AIProposalParserService.estimateTaskDuration.bind(AIProposalParserService),
  suggestAssignment: AIProposalParserService.suggestAssignment.bind(AIProposalParserService),
  recalculateWithAssumptions: AIProposalParserService.recalculateWithAssumptions.bind(AIProposalParserService)
}
