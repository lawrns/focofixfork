# AI Proposal Parser - Quick Reference

## Import
```typescript
import { aiProposalParser } from '@/lib/services/ai-proposal-parser'
```

## 1. Parse Input
```typescript
const result = await aiProposalParser.parseProposalInput(
  "Build user auth and dashboard by next month",
  { id: 'proj-1', name: 'App', urgency: 'high' }
)
// Returns: { summary, items[], confidence, totalEstimatedHours, risks[], assumptions[] }
```

## 2. Estimate Task
```typescript
const estimate = await aiProposalParser.estimateTaskDuration({
  title: 'Implement OAuth2 login',
  complexity: 'moderate',
  requiredSkills: ['OAuth2', 'Security']
})
// Returns: { estimatedHours, confidenceLevel, confidenceRange, reasoning, assumptions[], riskFactors[] }
```

## 3. Suggest Assignment
```typescript
const assignment = await aiProposalParser.suggestAssignment(
  task,
  teamMembers,
  currentWorkloads
)
// Returns: { recommendedAssignee, alternatives[], considerations }
```

## 4. What-If Analysis
```typescript
const recalculated = await aiProposalParser.recalculateWithAssumptions(
  'proposal-123',
  originalProposal,
  {
    teamAvailability: 75,
    complexityMultiplier: 1.3,
    bufferPercentage: 20
  }
)
// Returns: { originalTotalHours, newTotalHours, modifiedItems[], reassignments[], warnings[], recommendations[] }
```

## Key Types

```typescript
interface ProjectContext {
  id: string
  name: string
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  domain?: string
  techStack?: string[]
}

interface TaskDescription {
  title: string
  complexity?: 'simple' | 'moderate' | 'complex' | 'very_complex'
  requiredSkills?: string[]
}

interface TeamMember {
  id: string
  name: string
  skills: string[]
  availabilityHoursPerWeek: number
  currentWorkloadHours: number
}
```

## Full Documentation
See `AI-PROPOSAL-PARSER-README.md` for complete API reference and examples.
