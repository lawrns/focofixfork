/**
 * AI Proposal Parser Service - Usage Examples
 *
 * This file demonstrates how to use the AI Proposal Parser Service
 * in various real-world scenarios.
 */

import { aiProposalParser, type ProjectContext, type TaskDescription } from './ai-proposal-parser'

// ============================================================================
// EXAMPLE 1: Parse a voice transcript into structured proposal
// ============================================================================

async function example1_parseVoiceTranscript() {
  const voiceTranscript = `
    Okay so we need to build a new customer dashboard for the mobile app.
    The main priority is to show recent orders and let users track deliveries.
    We also need to add a feature where they can save favorite items for quick reordering.

    This needs to be done by end of month because we're launching the new app version.
    Sarah mentioned she can handle the API work and John is available for the UI.

    Oh and we should also fix that bug where notifications aren't showing up on Android.
    That's urgent - customers are complaining.
  `

  const projectContext: ProjectContext = {
    id: 'proj-123',
    name: 'Mobile App v2.0',
    description: 'Next generation mobile shopping experience',
    teamSize: 8,
    urgency: 'high',
    domain: 'E-commerce',
    techStack: ['React Native', 'Node.js', 'PostgreSQL']
  }

  try {
    const result = await aiProposalParser.parseProposalInput(voiceTranscript, projectContext)

    console.log('Parsed Proposal:')
    console.log(`Summary: ${result.summary}`)
    console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`)
    console.log(`Total Items: ${result.items.length}`)
    console.log(`Estimated Hours: ${result.totalEstimatedHours}`)
    console.log('\nItems:')
    result.items.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.priority}] ${item.title} (${item.estimatedHours}h)`)
    })

    if (result.risks && result.risks.length > 0) {
      console.log('\nIdentified Risks:')
      result.risks.forEach(risk => console.log(`  - ${risk}`))
    }
  } catch (error) {
    console.error('Failed to parse proposal:', error)
  }
}

// ============================================================================
// EXAMPLE 2: Estimate task duration with historical data
// ============================================================================

async function example2_estimateWithHistory() {
  const task: TaskDescription = {
    title: 'Implement OAuth2 authentication with Google Sign-In',
    description: 'Add Google OAuth2 login flow with token refresh and secure session management',
    type: 'feature',
    complexity: 'moderate',
    requiredSkills: ['OAuth2', 'Security', 'Backend', 'API Integration']
  }

  // Simulate historical data from similar tasks
  const historicalData = [
    {
      taskId: 'task-456',
      title: 'Implement GitHub OAuth login',
      type: 'feature' as const,
      estimatedHours: 12,
      actualHours: 16,
      complexity: 'moderate',
      completedBy: 'user-sarah',
      completedAt: '2024-01-15'
    },
    {
      taskId: 'task-789',
      title: 'Add JWT token refresh mechanism',
      type: 'feature' as const,
      estimatedHours: 8,
      actualHours: 10,
      complexity: 'moderate',
      completedBy: 'user-mike',
      completedAt: '2024-02-03'
    }
  ]

  try {
    const estimate = await aiProposalParser.estimateTaskDuration(task, historicalData)

    console.log('Task Estimation:')
    console.log(`Estimated Hours: ${estimate.estimatedHours}`)
    console.log(`Confidence: ${(estimate.confidenceLevel * 100).toFixed(0)}%`)
    console.log(`Range: ${estimate.confidenceRange.min}-${estimate.confidenceRange.max} hours`)
    console.log(`\nReasoning: ${estimate.reasoning}`)

    if (estimate.assumptions.length > 0) {
      console.log('\nAssumptions:')
      estimate.assumptions.forEach(assumption => console.log(`  - ${assumption}`))
    }

    if (estimate.riskFactors && estimate.riskFactors.length > 0) {
      console.log('\nRisk Factors:')
      estimate.riskFactors.forEach(risk => console.log(`  - ${risk}`))
    }

    if (estimate.comparableTasks && estimate.comparableTasks.length > 0) {
      console.log('\nComparable Tasks:')
      estimate.comparableTasks.forEach(comparable => {
        console.log(`  - ${comparable.title} (${(comparable.similarity * 100).toFixed(0)}% similar, ${comparable.actualHours}h)`)
      })
    }
  } catch (error) {
    console.error('Failed to estimate task:', error)
  }
}

// ============================================================================
// EXAMPLE 3: Suggest optimal task assignment
// ============================================================================

async function example3_suggestAssignment() {
  const task: TaskDescription = {
    title: 'Optimize database queries for dashboard',
    description: 'Profile and optimize slow queries affecting dashboard load time',
    type: 'task',
    complexity: 'complex',
    requiredSkills: ['PostgreSQL', 'Performance Optimization', 'SQL']
  }

  const teamMembers = [
    {
      id: 'user-sarah',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      role: 'Backend Engineer',
      skills: ['Node.js', 'PostgreSQL', 'Redis', 'Performance Optimization'],
      availabilityHoursPerWeek: 40,
      currentWorkloadHours: 28,
      timezone: 'America/Los_Angeles',
      performanceHistory: {
        averageTaskCompletionTime: 0.95, // 95% of estimated time
        taskCompletionRate: 0.92
      }
    },
    {
      id: 'user-mike',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'Full Stack Engineer',
      skills: ['React', 'Node.js', 'MongoDB', 'GraphQL'],
      availabilityHoursPerWeek: 40,
      currentWorkloadHours: 35,
      timezone: 'America/New_York',
      performanceHistory: {
        averageTaskCompletionTime: 1.10,
        taskCompletionRate: 0.85
      }
    },
    {
      id: 'user-alex',
      name: 'Alex Rodriguez',
      email: 'alex@example.com',
      role: 'DevOps Engineer',
      skills: ['AWS', 'PostgreSQL', 'Kubernetes', 'Monitoring'],
      availabilityHoursPerWeek: 40,
      currentWorkloadHours: 38,
      timezone: 'America/Chicago',
      performanceHistory: {
        averageTaskCompletionTime: 1.05,
        taskCompletionRate: 0.88
      }
    }
  ]

  const workloads = teamMembers.map(member => ({
    memberId: member.id,
    currentTaskCount: Math.floor(member.currentWorkloadHours / 8),
    currentHours: member.currentWorkloadHours,
    capacityHours: member.availabilityHoursPerWeek,
    upcomingDeadlines: [],
    utilizationPercentage: (member.currentWorkloadHours / member.availabilityHoursPerWeek) * 100
  }))

  try {
    const assignment = await aiProposalParser.suggestAssignment(task, teamMembers, workloads)

    console.log('Assignment Recommendation:')
    console.log(`\nRecommended: ${assignment.recommendedAssignee.name}`)
    console.log(`Score: ${(assignment.recommendedAssignee.score * 100).toFixed(0)}%`)
    console.log(`Reasoning: ${assignment.recommendedAssignee.reasoning}`)

    if (assignment.alternatives.length > 0) {
      console.log('\nAlternatives:')
      assignment.alternatives.forEach((alt, i) => {
        console.log(`  ${i + 1}. ${alt.name} (${(alt.score * 100).toFixed(0)}%)`)
        console.log(`     ${alt.reasoning}`)
      })
    }

    console.log('\nConsiderations:')
    console.log(`Workload Balance: ${assignment.considerations.workloadBalance}`)
    console.log(`Skill Match: ${assignment.considerations.skillMatch}`)
    console.log(`Availability: ${assignment.considerations.availability}`)

    if (assignment.considerations.riskFactors && assignment.considerations.riskFactors.length > 0) {
      console.log('\nRisk Factors:')
      assignment.considerations.riskFactors.forEach(risk => console.log(`  - ${risk}`))
    }
  } catch (error) {
    console.error('Failed to suggest assignment:', error)
  }
}

// ============================================================================
// EXAMPLE 4: Recalculate proposal with different assumptions (what-if)
// ============================================================================

async function example4_whatIfScenario() {
  // Simulated original proposal
  const originalProposal = {
    summary: 'Build customer dashboard with order tracking and favorites',
    confidence: 0.85,
    items: [
      {
        type: 'task' as const,
        title: 'Design dashboard UI mockups',
        description: 'Create high-fidelity mockups for all dashboard screens',
        itemType: 'task' as const,
        status: 'backlog' as const,
        priority: 'high' as const,
        estimatedHours: 12,
        assigneeId: 'user-sarah'
      },
      {
        type: 'task' as const,
        title: 'Implement order tracking API',
        description: 'Build REST API endpoints for real-time order tracking',
        itemType: 'feature' as const,
        status: 'backlog' as const,
        priority: 'high' as const,
        estimatedHours: 20,
        assigneeId: 'user-mike'
      },
      {
        type: 'task' as const,
        title: 'Build favorites feature',
        description: 'Implement save/unsave favorites with persistence',
        itemType: 'feature' as const,
        status: 'backlog' as const,
        priority: 'medium' as const,
        estimatedHours: 16,
        assigneeId: 'user-sarah'
      }
    ],
    totalEstimatedHours: 48
  }

  // What-if scenario: Team is at 75% capacity, tasks are more complex than expected
  const assumptions = {
    teamAvailability: 75, // Team only 75% available (vacations, meetings, etc.)
    complexityMultiplier: 1.3, // Tasks are 30% more complex than initially thought
    bufferPercentage: 20, // Add 20% buffer for unknowns
    reassignOverloaded: true, // Redistribute work if someone is overloaded
    parallelizationFactor: 2 // Two tasks can be worked on in parallel
  }

  try {
    const recalculated = await aiProposalParser.recalculateWithAssumptions(
      'proposal-123',
      originalProposal,
      assumptions
    )

    console.log('Recalculation Results:')
    console.log(`\nOriginal Total: ${recalculated.originalTotalHours} hours (${recalculated.originalDuration} days)`)
    console.log(`New Total: ${recalculated.newTotalHours} hours (${recalculated.newDuration} days)`)
    console.log(`Impact: +${recalculated.newTotalHours - recalculated.originalTotalHours} hours, ` +
                `${recalculated.newDuration > recalculated.originalDuration ? '+' : ''}${recalculated.newDuration - recalculated.originalDuration} days`)

    if (recalculated.reassignments && recalculated.reassignments.length > 0) {
      console.log('\nReassignments:')
      recalculated.reassignments?.forEach(reassignment => {
        console.log(`  - ${reassignment.itemTitle}`)
        console.log(`    ${reassignment.previousAssignee} → ${reassignment.newAssignee}`)
        console.log(`    Reason: ${reassignment.reason}`)
      })
    }

    if (recalculated.warnings && recalculated.warnings.length > 0) {
      console.log('\nWarnings:')
      recalculated.warnings.forEach(warning => console.log(`  ⚠ ${warning}`))
    }

    if (recalculated.recommendations && recalculated.recommendations.length > 0) {
      console.log('\nRecommendations:')
      recalculated.recommendations.forEach(rec => console.log(`  ✓ ${rec}`))
    }
  } catch (error) {
    console.error('Failed to recalculate proposal:', error)
  }
}

// ============================================================================
// EXAMPLE 5: Real-world workflow - Parse → Estimate → Assign
// ============================================================================

async function example5_completeWorkflow() {
  console.log('=== Complete AI Proposal Workflow ===\n')

  // Step 1: Parse meeting notes
  console.log('Step 1: Parsing meeting notes...')
  const meetingNotes = `
    Team meeting notes - Jan 18, 2026

    Discussed the new analytics dashboard project.
    We need to add real-time metrics visualization, export to PDF functionality,
    and user permission controls.

    Timeline is tight - we have 3 weeks before the product demo.
    Emma can lead the backend work, and David will handle the charts.
  `

  const context: ProjectContext = {
    id: 'analytics-proj',
    name: 'Analytics Dashboard',
    teamSize: 4,
    urgency: 'high'
  }

  const proposal = await aiProposalParser.parseProposalInput(meetingNotes, context)
  console.log(`✓ Parsed ${proposal.items.length} items\n`)

  // Step 2: Estimate each task
  console.log('Step 2: Estimating task durations...')
  for (const item of proposal.items) {
    if (item.type === 'task') {
      const taskDesc: TaskDescription = {
        title: item.title,
        description: item.description,
        type: item.itemType,
        complexity: 'moderate'
      }
      const estimate = await aiProposalParser.estimateTaskDuration(taskDesc)
      console.log(`  ${item.title}: ${estimate.estimatedHours}h (confidence: ${(estimate.confidenceLevel * 100).toFixed(0)}%)`)
    }
  }
  console.log()

  // Step 3: Suggest assignments
  console.log('Step 3: Suggesting team assignments...')
  const team = [
    {
      id: 'user-emma',
      name: 'Emma',
      role: 'Backend',
      skills: ['Node.js', 'PostgreSQL'],
      availabilityHoursPerWeek: 40,
      currentWorkloadHours: 20
    },
    {
      id: 'user-david',
      name: 'David',
      role: 'Frontend',
      skills: ['React', 'D3.js', 'Charts'],
      availabilityHoursPerWeek: 40,
      currentWorkloadHours: 25
    }
  ]

  const workloads = team.map(m => ({
    memberId: m.id,
    currentTaskCount: 3,
    currentHours: m.currentWorkloadHours,
    capacityHours: m.availabilityHoursPerWeek,
    upcomingDeadlines: [],
    utilizationPercentage: (m.currentWorkloadHours / m.availabilityHoursPerWeek) * 100
  }))

  for (const item of proposal.items.slice(0, 2)) { // Just first 2 for demo
    if (item.type === 'task') {
      const taskDesc: TaskDescription = {
        title: item.title,
        type: item.itemType,
        complexity: 'moderate'
      }
      const assignment = await aiProposalParser.suggestAssignment(taskDesc, team, workloads)
      console.log(`  ${item.title} → ${assignment.recommendedAssignee.name}`)
    }
  }

  console.log('\n✓ Workflow complete!')
}

// ============================================================================
// Run examples (uncomment to test)
// ============================================================================

// Example 1: Basic parsing
// example1_parseVoiceTranscript()

// Example 2: Duration estimation
// example2_estimateWithHistory()

// Example 3: Team assignment
// example3_suggestAssignment()

// Example 4: What-if scenarios
// example4_whatIfScenario()

// Example 5: Complete workflow
// example5_completeWorkflow()

// Export for testing
export {
  example1_parseVoiceTranscript,
  example2_estimateWithHistory,
  example3_suggestAssignment,
  example4_whatIfScenario,
  example5_completeWorkflow
}
