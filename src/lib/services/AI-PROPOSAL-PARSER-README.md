# AI Proposal Parser Service

Production-ready AI service for parsing raw input (voice transcripts, text, files) into structured proposal items using OpenAI's GPT-4.

## Features

- **Intelligent Parsing**: Convert unstructured text into actionable tasks, milestones, and dependencies
- **Smart Estimation**: AI-powered task duration estimation with confidence intervals
- **Team Assignment**: Optimal task assignment based on skills, availability, and workload
- **What-if Analysis**: Recalculate proposals with different assumptions for scenario planning
- **Production Quality**: Comprehensive error handling, validation, and structured outputs

## Installation

The service is already integrated into the project. Import it from:

```typescript
import { aiProposalParser } from '@/lib/services/ai-proposal-parser'
```

## API Reference

### 1. Parse Proposal Input

Converts raw text (voice transcripts, meeting notes, emails) into structured proposal items.

```typescript
async function parseProposalInput(
  input: string,
  projectContext: ProjectContext
): Promise<ParsedProposal>
```

**Parameters:**
- `input` - Raw text to parse (voice transcript, meeting notes, etc.)
- `projectContext` - Project context including name, domain, tech stack, urgency

**Returns:**
- `ParsedProposal` - Structured proposal with tasks, milestones, estimates, and risks

**Example:**
```typescript
const result = await aiProposalParser.parseProposalInput(
  "We need to add user authentication and a dashboard by next month",
  {
    id: 'proj-123',
    name: 'Mobile App',
    domain: 'E-commerce',
    urgency: 'high'
  }
)

console.log(result.summary)
console.log(`Found ${result.items.length} items`)
console.log(`Total estimated: ${result.totalEstimatedHours} hours`)
```

### 2. Estimate Task Duration

Provides AI-powered time estimation with confidence analysis and reasoning.

```typescript
async function estimateTaskDuration(
  task: TaskDescription,
  historicalData?: TaskHistory[]
): Promise<AIEstimate>
```

**Parameters:**
- `task` - Task description with title, complexity, required skills
- `historicalData` - Optional array of similar completed tasks for better accuracy

**Returns:**
- `AIEstimate` - Estimated hours, confidence level, range, reasoning, and risk factors

**Example:**
```typescript
const estimate = await aiProposalParser.estimateTaskDuration(
  {
    title: 'Implement OAuth2 authentication',
    complexity: 'moderate',
    requiredSkills: ['OAuth2', 'Security', 'Backend']
  },
  historicalTasks // Optional historical data
)

console.log(`Estimate: ${estimate.estimatedHours}h`)
console.log(`Confidence: ${estimate.confidenceLevel * 100}%`)
console.log(`Range: ${estimate.confidenceRange.min}-${estimate.confidenceRange.max}h`)
console.log(`Reasoning: ${estimate.reasoning}`)
```

### 3. Suggest Task Assignment

Recommends optimal team member assignment based on skills, workload, and availability.

```typescript
async function suggestAssignment(
  task: TaskDescription,
  teamMembers: TeamMember[],
  workloads: Workload[]
): Promise<AIAssignment>
```

**Parameters:**
- `task` - Task to assign
- `teamMembers` - Array of team members with skills and availability
- `workloads` - Current workload data for each team member

**Returns:**
- `AIAssignment` - Recommended assignee, alternatives, and detailed reasoning

**Example:**
```typescript
const assignment = await aiProposalParser.suggestAssignment(
  {
    title: 'Optimize database queries',
    requiredSkills: ['PostgreSQL', 'Performance']
  },
  teamMembers,
  currentWorkloads
)

console.log(`Assign to: ${assignment.recommendedAssignee.name}`)
console.log(`Score: ${assignment.recommendedAssignee.score}`)
console.log(`Reasoning: ${assignment.recommendedAssignee.reasoning}`)

// Check alternatives
assignment.alternatives.forEach(alt => {
  console.log(`Alternative: ${alt.name} (score: ${alt.score})`)
})
```

### 4. Recalculate with Assumptions

Performs what-if analysis by recalculating proposals with different assumptions.

```typescript
async function recalculateWithAssumptions(
  proposalId: string,
  originalProposal: ParsedProposal,
  assumptions: Assumptions
): Promise<RecalculatedProposal>
```

**Parameters:**
- `proposalId` - Unique identifier for the proposal
- `originalProposal` - The original parsed proposal
- `assumptions` - New assumptions to apply (team availability, complexity, buffers, etc.)

**Returns:**
- `RecalculatedProposal` - Updated estimates, reassignments, warnings, and recommendations

**Example:**
```typescript
const recalculated = await aiProposalParser.recalculateWithAssumptions(
  'proposal-123',
  originalProposal,
  {
    teamAvailability: 75,      // Team at 75% capacity
    complexityMultiplier: 1.3, // Tasks 30% more complex
    bufferPercentage: 20,      // Add 20% buffer
    reassignOverloaded: true   // Redistribute work
  }
)

console.log(`Original: ${recalculated.originalTotalHours}h`)
console.log(`New: ${recalculated.newTotalHours}h`)
console.log(`Impact: ${recalculated.newDuration - recalculated.originalDuration} days`)

// Check warnings
recalculated.warnings.forEach(warning => console.warn(warning))
```

## Type Definitions

### ProjectContext
```typescript
interface ProjectContext {
  id: string
  name: string
  description?: string
  teamSize?: number
  currentWorkload?: number
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  domain?: string
  techStack?: string[]
}
```

### TaskDescription
```typescript
interface TaskDescription {
  title: string
  description?: string
  type?: WorkItemType
  requiredSkills?: string[]
  complexity?: 'simple' | 'moderate' | 'complex' | 'very_complex'
  dependencies?: string[]
}
```

### TeamMember
```typescript
interface TeamMember {
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
```

### Assumptions
```typescript
interface Assumptions {
  teamAvailability?: number           // Percentage (0-100)
  workingHoursPerDay?: number        // Hours per day
  complexityMultiplier?: number      // Multiplier (e.g., 1.3 = 30% more complex)
  bufferPercentage?: number          // Buffer percentage to add
  priorityAdjustment?: 'increase' | 'decrease' | 'maintain'
  reassignOverloaded?: boolean       // Redistribute overloaded work
  parallelizationFactor?: number     // Number of parallel tasks
}
```

## Prompt Engineering

The service uses production-quality prompts optimized for:

### Parsing
- **Low temperature (0.3)** for consistent extraction
- Comprehensive rules for task identification
- Dependency detection with multiple phrase patterns
- Priority inference from urgency keywords
- Automatic milestone grouping

### Estimation
- **Historical data weighting** when available
- Industry-standard complexity multipliers
- Confidence scoring based on data quality
- Risk factor identification
- Comparable task matching

### Assignment
- **Multi-factor scoring** (40% skill, 30% availability, 20% performance, 10% balance)
- Workload distribution optimization
- Performance history consideration
- Alternative recommendations

### Recalculation
- **Proportional impact** from assumption changes
- Dependency-aware duration calculation
- Automatic reassignment logic
- Risk warnings and recommendations

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  const result = await aiProposalParser.parseProposalInput(input, context)
  // Use result
} catch (error) {
  if (error instanceof Error) {
    console.error('Parsing failed:', error.message)
    // Handle gracefully
  }
}
```

Common errors:
- `Proposal parsing failed`: Invalid input or AI response
- `Task estimation failed`: Missing required task data
- `Assignment suggestion failed`: Invalid team data
- `Recalculation failed`: Invalid assumptions

## Validation

All outputs are validated and sanitized:

- **ParsedProposal**: Validates items, confidence scores, total hours
- **AIEstimate**: Ensures valid hours, confidence levels, and ranges
- **AIAssignment**: Verifies member IDs exist in team
- **RecalculatedProposal**: Validates calculations and reassignments

## Best Practices

### 1. Provide Context
```typescript
// Good: Rich context
const context = {
  id: 'proj-123',
  name: 'E-commerce Platform',
  description: 'Next-gen shopping experience',
  domain: 'Retail',
  techStack: ['React', 'Node.js', 'PostgreSQL'],
  urgency: 'high'
}

// Avoid: Minimal context
const context = { id: 'proj-123', name: 'Project' }
```

### 2. Use Historical Data
```typescript
// Estimate with historical data for better accuracy
const estimate = await aiProposalParser.estimateTaskDuration(
  task,
  similarCompletedTasks // Include when available
)
```

### 3. Handle Confidence Scores
```typescript
const result = await aiProposalParser.parseProposalInput(input, context)

if (result.confidence < 0.7) {
  console.warn('Low confidence parsing - review items carefully')
  // Prompt user to review and confirm
}
```

### 4. Review Assignments
```typescript
const assignment = await aiProposalParser.suggestAssignment(task, team, workloads)

// Always check alternatives
if (assignment.alternatives.length > 0) {
  console.log('Consider alternatives:')
  assignment.alternatives.forEach(alt => {
    console.log(`- ${alt.name} (${alt.score})`)
  })
}
```

### 5. Use What-if for Planning
```typescript
// Test different scenarios
const scenarios = [
  { name: 'Optimistic', teamAvailability: 100, complexityMultiplier: 1.0 },
  { name: 'Realistic', teamAvailability: 80, complexityMultiplier: 1.2 },
  { name: 'Conservative', teamAvailability: 70, complexityMultiplier: 1.5 }
]

for (const scenario of scenarios) {
  const result = await aiProposalParser.recalculateWithAssumptions(
    proposalId,
    original,
    scenario
  )
  console.log(`${scenario.name}: ${result.newDuration} days`)
}
```

## Performance Considerations

- **API Calls**: Each method makes 1 OpenAI API call
- **Latency**: Typical response time 2-5 seconds per call
- **Tokens**: Average usage 500-2000 tokens per request
- **Rate Limits**: Respect OpenAI rate limits (implement backoff if needed)
- **Caching**: Consider caching estimates for identical tasks

## Integration Examples

### With Voice Transcript API
```typescript
import { aiProposalParser } from '@/lib/services/ai-proposal-parser'

async function handleVoiceTranscript(audioFile: File, projectId: string) {
  // 1. Transcribe audio (using Whisper or similar)
  const transcript = await transcribeAudio(audioFile)

  // 2. Get project context
  const project = await getProject(projectId)
  const context = {
    id: project.id,
    name: project.name,
    domain: project.domain,
    urgency: 'medium'
  }

  // 3. Parse into structured proposal
  const proposal = await aiProposalParser.parseProposalInput(transcript, context)

  // 4. Save to database
  await saveProposal(proposal)

  return proposal
}
```

### With Email Parser
```typescript
async function parseProjectEmail(emailBody: string, projectId: string) {
  const context = await getProjectContext(projectId)
  const proposal = await aiProposalParser.parseProposalInput(emailBody, context)

  // Auto-create tasks from high-confidence items
  for (const item of proposal.items) {
    if (item.type === 'task' && proposal.confidence > 0.8) {
      await createTask({
        title: item.title,
        description: item.description,
        priority: item.priority,
        estimatedHours: item.estimatedHours
      })
    }
  }
}
```

### With Project Planning Workflow
```typescript
async function generateProjectPlan(requirements: string, teamId: string) {
  // 1. Parse requirements
  const context = { id: 'new-project', name: 'New Project' }
  const proposal = await aiProposalParser.parseProposalInput(requirements, context)

  // 2. Estimate all tasks
  const taskEstimates = await Promise.all(
    proposal.items.map(item =>
      aiProposalParser.estimateTaskDuration({
        title: item.title,
        description: item.description,
        complexity: 'moderate'
      })
    )
  )

  // 3. Assign to team
  const team = await getTeamMembers(teamId)
  const workloads = await getCurrentWorkloads(teamId)

  const assignments = await Promise.all(
    proposal.items.map(item =>
      aiProposalParser.suggestAssignment(
        { title: item.title, description: item.description },
        team,
        workloads
      )
    )
  )

  return {
    proposal,
    estimates: taskEstimates,
    assignments
  }
}
```

## Testing

See `ai-proposal-parser.examples.ts` for comprehensive usage examples covering:
- Voice transcript parsing
- Historical data estimation
- Team assignment optimization
- What-if scenario analysis
- Complete end-to-end workflows

## Support

For issues or questions:
1. Check the examples file for common patterns
2. Review type definitions for expected inputs
3. Examine error messages for specific issues
4. Ensure OpenAI API key is configured (`OPENAI_API_KEY`)

## License

Part of the FOCO project management system.
