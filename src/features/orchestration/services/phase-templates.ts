/**
 * Phase Templates - Build context, prompts, and artifact templates for each phase
 */

import {
  OrchestrationPhaseType,
  WorkflowPhase,
  OrchestrationWorkflow,
  PhaseContext,
  ArtifactTemplate,
} from '../types';

/**
 * Build accumulated context from previous phases
 */
export function buildPhaseContext(
  workflow: OrchestrationWorkflow,
  previousPhases: WorkflowPhase[]
): PhaseContext {
  const accumulatedResults: Record<string, unknown> = {};
  
  // Accumulate results from all completed phases
  for (const phase of previousPhases) {
    if (phase.status === 'complete' && phase.result) {
      accumulatedResults[phase.phase_type] = phase.result;
    }
  }

  // Extract brain dump from first phase if available
  const brainDump = workflow.context_accumulator?.brain_dump as string | undefined;

  return {
    workflowTitle: workflow.title,
    brainDump,
    accumulatedResults,
    previousPhaseResults: previousPhases.length > 0 
      ? previousPhases[previousPhases.length - 1]?.result 
      : undefined,
    currentPhaseIdx: workflow.current_phase_idx,
  };
}

/**
 * Build the system prompt for a specific phase
 */
export function buildPhaseSystemPrompt(
  phaseType: OrchestrationPhaseType,
  context: PhaseContext
): string {
  const baseContext = buildBaseContext(context);
  const phaseInstructions = getPhaseInstructions(phaseType);
  const artifactInstructions = getArtifactInstructions(phaseType);

  return `${baseContext}

${phaseInstructions}

${artifactInstructions}

Remember: You are part of a 12-phase workflow orchestration system. Your output will be used as input for subsequent phases, so be thorough and structure your response according to the artifact requirements.`;
}

function buildBaseContext(context: PhaseContext): string {
  const parts: string[] = [];

  parts.push(`# Workflow: ${context.workflowTitle}`);

  if (context.brainDump) {
    parts.push(`## Original Brain Dump\n\n${context.brainDump}`);
  }

  if (Object.keys(context.accumulatedResults).length > 0) {
    parts.push('## Previous Phase Results\n');
    for (const [phaseType, result] of Object.entries(context.accumulatedResults)) {
      parts.push(`### ${phaseType}\n${JSON.stringify(result, null, 2)}`);
    }
  }

  parts.push(`## Current Position\nPhase ${context.currentPhaseIdx + 1} of 12`);

  return parts.join('\n\n');
}

function getPhaseInstructions(phaseType: OrchestrationPhaseType): string {
  const instructions: Record<OrchestrationPhaseType, string> = {
    brain_dump: `# Phase 1: Brain Dump
Your task is to structure and expand the initial brain dump into a comprehensive ideation document.

## Instructions
1. Organize ideas into categories (features, users, technical, business)
2. Identify core value propositions
3. Flag assumptions that need validation
4. Prioritize features by importance
5. Identify potential risks and blockers

## Output Format
Return a structured JSON with categorized ideas and priorities.`,

    prd: `# Phase 2: Product Requirements Document
Transform the structured brain dump into a formal PRD.

## Instructions
1. Define clear user personas
2. Write detailed user stories
3. Define functional requirements
4. Define non-functional requirements (performance, security, scale)
5. Create acceptance criteria
6. Prioritize using MoSCoW method

## Output Format
Return a structured PRD document with all sections.`,

    research: `# Phase 3: Research
Conduct technical and market research to validate assumptions.

## Instructions
1. Research similar products/competitors
2. Identify technical approaches and tradeoffs
3. Research APIs, libraries, and tools
4. Analyze market positioning
5. Identify technical risks
6. Document findings with sources

## Output Format
Return structured research findings with recommendations.`,

    discovery: `# Phase 4: Discovery
Deep dive into requirements and user needs.

## Instructions
1. Conduct detailed user journey mapping
2. Define edge cases and error scenarios
3. Identify integration points
4. Define data models and relationships
5. Document business rules
6. Clarify ambiguous requirements

## Output Format
Return detailed discovery document with user journeys and requirements.`,

    architecture: `# Phase 5: Architecture
Design the system architecture.

## Instructions
1. Define high-level system components
2. Design data architecture (database schemas, data flow)
3. Define API contracts
4. Design frontend architecture
5. Plan infrastructure (hosting, CDN, caching)
6. Identify security considerations
7. Plan for scalability

## Output Format
Return architecture diagrams and specifications as structured data.`,

    implementation: `# Phase 6: Implementation
Execute the build phase.

## Instructions
1. Set up project structure
2. Implement core features
3. Follow coding standards and best practices
4. Write unit tests
5. Document code
6. Create migration scripts if needed

## Output Format
Return implementation summary with file changes and test coverage.`,

    testing: `# Phase 7: Testing
Comprehensive QA and validation.

## Instructions
1. Execute test plans
2. Perform integration testing
3. Run performance tests
4. Conduct security testing
5. Validate against acceptance criteria
6. Document bugs and issues
7. Verify cross-browser compatibility

## Output Format
Return test results with pass/fail status and issue tracking.`,

    review: `# Phase 8: Review
Code and design review.

## Instructions
1. Review code quality
2. Check for security vulnerabilities
3. Verify adherence to architecture
4. Review UX/UI implementation
5. Check documentation completeness
6. Identify refactoring opportunities
7. Provide actionable feedback

## Output Format
Return review report with findings and recommendations.`,

    documentation: `# Phase 9: Documentation
Write comprehensive documentation.

## Instructions
1. Write user documentation
2. Create API documentation
3. Document deployment procedures
4. Write runbooks for operations
5. Create onboarding guides
6. Document troubleshooting steps

## Output Format
Return documentation structure with links/content.`,

    deployment: `# Phase 10: Deployment
Deploy to production environment.

## Instructions
1. Prepare deployment checklist
2. Configure environment variables
3. Set up CI/CD pipeline if needed
4. Execute deployment steps
5. Verify deployment success
6. Configure domain and SSL
7. Set up monitoring

## Output Format
Return deployment summary with timestamps and verification status.`,

    monitoring: `# Phase 11: Monitoring
Setup monitoring, alerting, and observability.

## Instructions
1. Configure error tracking
2. Set up performance monitoring
3. Create alerting rules
4. Set up logging aggregation
5. Create dashboards
6. Define SLOs/SLIs
7. Document incident response

## Output Format
Return monitoring configuration and dashboard links.`,

    retrospective: `# Phase 12: Retrospective
Review the workflow and capture learnings.

## Instructions
1. Document what went well
2. Identify challenges and blockers
3. Capture lessons learned
4. Suggest process improvements
5. Update handbook with insights
6. Plan follow-up actions

## Output Format
Return retrospective summary with actionable improvements.`,
  };

  return instructions[phaseType] || `# Phase: ${phaseType}\n\nExecute this phase according to the workflow context.`;
}

function getArtifactInstructions(phaseType: OrchestrationPhaseType): string {
  const artifact = getArtifactTemplate(phaseType);
  
  return `## Required Output Format

You must return your response as a JSON object with the following structure:

\`\`\`json
${JSON.stringify(artifact.structure, null, 2)}
\`\`\`

### Required Fields
${artifact.requiredFields.map(f => `- ${f}`).join('\n')}

### Format
Output format: ${artifact.format}`;
}

/**
 * Get the expected artifact template for each phase
 */
export function getArtifactTemplate(phaseType: OrchestrationPhaseType): ArtifactTemplate {
  const templates: Record<OrchestrationPhaseType, ArtifactTemplate> = {
    brain_dump: {
      structure: {
        summary: 'Brief summary of the idea',
        categories: {
          features: ['List of features'],
          users: ['Target user types'],
          technical: ['Technical considerations'],
          business: ['Business objectives'],
        },
        priorities: {
          critical: ['Must-have features'],
          important: ['Should-have features'],
          nice_to_have: ['Could-have features'],
        },
        assumptions: ['List of assumptions to validate'],
        risks: ['Potential risks and blockers'],
        next_steps: ['Recommended next actions'],
      },
      requiredFields: ['summary', 'categories', 'priorities'],
      format: 'json',
    },

    prd: {
      structure: {
        overview: 'Product overview',
        personas: [
          { name: 'Persona name', description: 'Description', goals: ['Goals'] }
        ],
        user_stories: [
          { as_a: 'role', i_want: 'feature', so_that: 'benefit', acceptance_criteria: ['criteria'] }
        ],
        functional_requirements: ['List of functional requirements'],
        non_functional_requirements: {
          performance: ['Performance requirements'],
          security: ['Security requirements'],
          scalability: ['Scalability requirements'],
        },
        moscow: {
          must_have: ['Critical features'],
          should_have: ['Important features'],
          could_have: ['Nice-to-have features'],
          wont_have: ['Explicitly excluded features'],
        },
      },
      requiredFields: ['overview', 'personas', 'user_stories', 'functional_requirements'],
      format: 'json',
    },

    research: {
      structure: {
        competitors: [
          { name: 'Competitor name', strengths: ['strengths'], weaknesses: ['weaknesses'] }
        ],
        technical_options: [
          { option: 'Option name', pros: ['pros'], cons: ['cons'], recommendation: 'recommendation' }
        ],
        apis_and_tools: ['Relevant APIs and tools'],
        market_analysis: 'Market positioning analysis',
        technical_risks: ['Identified risks'],
        recommendations: ['Actionable recommendations'],
        sources: ['Research sources'],
      },
      requiredFields: ['competitors', 'technical_options', 'recommendations'],
      format: 'json',
    },

    discovery: {
      structure: {
        user_journeys: [
          { 
            persona: 'User type', 
            scenario: 'Usage scenario',
            steps: ['Step 1', 'Step 2'],
            emotions: ['Emotion at each step']
          }
        ],
        edge_cases: ['Identified edge cases'],
        integrations: ['Required integrations'],
        data_model: {
          entities: ['List of entities'],
          relationships: ['Entity relationships'],
        },
        business_rules: ['Business rules and constraints'],
        clarified_requirements: ['Requirements clarified during discovery'],
      },
      requiredFields: ['user_journeys', 'edge_cases', 'data_model'],
      format: 'json',
    },

    architecture: {
      structure: {
        overview: 'Architecture overview',
        components: [
          { name: 'Component name', responsibility: 'What it does', tech_stack: 'Technologies used' }
        ],
        data_architecture: {
          database: 'Database choice',
          schemas: ['Schema definitions'],
          data_flow: 'How data flows through the system',
        },
        api_design: ['API endpoints with methods and descriptions'],
        frontend_architecture: 'Frontend structure and patterns',
        infrastructure: {
          hosting: 'Hosting solution',
          cdn: 'CDN configuration',
          caching: 'Caching strategy',
        },
        security: ['Security measures'],
        scalability_plan: 'How the system scales',
      },
      requiredFields: ['overview', 'components', 'data_architecture', 'api_design'],
      format: 'json',
    },

    implementation: {
      structure: {
        summary: 'Implementation summary',
        files_changed: [{ path: 'file path', description: 'what changed' }],
        features_implemented: ['List of implemented features'],
        test_coverage: {
          unit_tests: 'Unit test coverage %',
          integration_tests: 'Integration test status',
        },
        dependencies_added: ['New dependencies'],
        migrations: ['Database migrations if any'],
        documentation_created: ['Documentation files created'],
        known_issues: ['Any known issues or TODOs'],
      },
      requiredFields: ['summary', 'files_changed', 'features_implemented'],
      format: 'json',
    },

    testing: {
      structure: {
        summary: 'Test execution summary',
        test_plan: {
          total_tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
        },
        results: [
          { test: 'Test name', status: 'pass/fail', notes: 'Additional notes' }
        ],
        performance_results: {
          load_time: 'Page load metrics',
          api_response: 'API response times',
        },
        security_findings: ['Security test results'],
        cross_browser: ['Browser compatibility status'],
        bugs: [
          { id: 'BUG-001', severity: 'high/medium/low', description: 'Bug description' }
        ],
        recommendations: ['Testing recommendations'],
      },
      requiredFields: ['summary', 'test_plan', 'results'],
      format: 'json',
    },

    review: {
      structure: {
        summary: 'Review summary',
        code_quality: {
          score: 0,
          issues: ['Code quality issues'],
          strengths: ['Code quality strengths'],
        },
        security_review: {
          vulnerabilities: ['Found vulnerabilities'],
          risk_level: 'low/medium/high',
        },
        architecture_compliance: 'How well code follows architecture',
        ux_ui_review: 'UX/UI implementation review',
        documentation: 'Documentation completeness',
        refactoring_suggestions: ['Suggested refactorings'],
        action_items: [
          { priority: 'high/medium/low', description: 'Action to take', owner: 'Responsible party' }
        ],
        approval_status: 'approved/needs_changes/rejected',
      },
      requiredFields: ['summary', 'code_quality', 'approval_status'],
      format: 'json',
    },

    documentation: {
      structure: {
        summary: 'Documentation summary',
        user_docs: {
          getting_started: 'Getting started guide',
          features: 'Feature documentation',
          faq: 'Frequently asked questions',
        },
        api_docs: 'API documentation location/content',
        deployment_docs: 'Deployment procedures',
        runbooks: ['Operational runbooks'],
        onboarding: 'Onboarding guide for new team members',
        troubleshooting: 'Troubleshooting guide',
        docs_location: 'Where documentation is stored',
      },
      requiredFields: ['summary', 'user_docs', 'api_docs'],
      format: 'json',
    },

    deployment: {
      structure: {
        summary: 'Deployment summary',
        checklist: [
          { item: 'Checklist item', status: 'complete/pending', notes: 'Notes' }
        ],
        environment_config: 'Environment configuration details',
        deployment_steps: ['Steps executed'],
        verification: {
          smoke_tests: 'Smoke test results',
          health_checks: 'Health check status',
        },
        rollback_plan: 'How to rollback if needed',
        domain_config: 'Domain and SSL configuration',
        timestamp: 'Deployment timestamp',
        deployed_version: 'Version deployed',
      },
      requiredFields: ['summary', 'checklist', 'verification'],
      format: 'json',
    },

    monitoring: {
      structure: {
        summary: 'Monitoring setup summary',
        error_tracking: {
          service: 'Error tracking service',
          configuration: 'Configuration details',
        },
        performance_monitoring: {
          service: 'Performance monitoring service',
          metrics: ['Tracked metrics'],
        },
        alerting_rules: [
          { condition: 'Alert condition', severity: 'severity', action: 'Action to take' }
        ],
        logging: {
          aggregation: 'Log aggregation setup',
          retention: 'Log retention policy',
        },
        dashboards: ['Dashboard links/descriptions'],
        slos: [
          { metric: 'SLO metric', target: 'Target value', current: 'Current value' }
        ],
        incident_response: 'Incident response procedures',
      },
      requiredFields: ['summary', 'error_tracking', 'alerting_rules'],
      format: 'json',
    },

    retrospective: {
      structure: {
        summary: 'Retrospective summary',
        what_went_well: ['Successes and wins'],
        challenges: ['Challenges faced'],
        lessons_learned: ['Key lessons'],
        process_improvements: ['Suggested improvements'],
        handbook_updates: ['Knowledge to add to handbook'],
        follow_up_actions: [
          { action: 'Action item', owner: 'Owner', due_date: 'Due date' }
        ],
        metrics: {
          total_duration: 'Total time spent',
          total_cost: 'Total cost USD',
          phases_completed: 'Number of phases completed',
        },
      },
      requiredFields: ['summary', 'what_went_well', 'lessons_learned'],
      format: 'json',
    },
  };

  return templates[phaseType] || {
    structure: { result: 'Phase result data' },
    requiredFields: ['result'],
    format: 'json',
  };
}
