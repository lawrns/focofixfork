/**
 * OpenClaw Workspace File Parser
 * Parses and serializes SOUL.md, AGENTS.md, USER.md, IDENTITY.md, HEARTBEAT.md
 */

import type {
  IdentityConfig,
  SoulConfig,
  AgentsConfig,
  UserConfig,
  HeartbeatConfig,
  ChecklistItem,
  WorkflowStep,
  Project,
} from './types';

// ============================================
// IDENTITY.md Parser
// ============================================

export function parseIdentity(content: string): IdentityConfig {
  const lines = content.split('\n');
  const config: Partial<IdentityConfig> = {
    name: 'OpenClaw',
    emoji: '🦞',
    theme: 'lobster',
    creature: 'ai',
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- Name:')) {
      config.name = trimmed.replace('- Name:', '').trim();
    } else if (trimmed.startsWith('- Emoji:')) {
      config.emoji = trimmed.replace('- Emoji:', '').trim();
    } else if (trimmed.startsWith('- Theme:')) {
      config.theme = trimmed.replace('- Theme:', '').trim() as IdentityConfig['theme'];
    } else if (trimmed.startsWith('- Creature:')) {
      config.creature = trimmed.replace('- Creature:', '').trim() as IdentityConfig['creature'];
    } else if (trimmed.startsWith('- Avatar:')) {
      config.avatar = trimmed.replace('- Avatar:', '').trim();
    } else if (trimmed.startsWith('- Tagline:')) {
      config.tagline = trimmed.replace('- Tagline:', '').trim();
    }
  }

  return config as IdentityConfig;
}

export function serializeIdentity(config: IdentityConfig): string {
  return `# IDENTITY.md

## Identity

- Name: ${config.name}
- Emoji: ${config.emoji}
- Theme: ${config.theme}
- Creature: ${config.creature}
${config.avatar ? `- Avatar: ${config.avatar}` : ''}
${config.tagline ? `- Tagline: ${config.tagline}` : ''}

## Visual Identity

${config.emoji} ${config.name} is a ${config.creature}-type assistant with a ${config.theme} aesthetic.
`;
}

// ============================================
// SOUL.md Parser
// ============================================

export function parseSoul(content: string): SoulConfig {
  const lines = content.split('\n');
  const config: SoulConfig = {
    coreTruths: [],
    communicationStyle: {
      tone: 'professional',
      verbosity: 'balanced',
      humorLevel: 3,
      formality: 'neutral',
    },
    values: [],
    boundaries: [],
    antiPatterns: [],
    exampleResponses: {
      good: [],
      bad: [],
    },
  };

  let currentSection: string | null = null;
  let inExampleBlock = false;
  let exampleType: 'good' | 'bad' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').toLowerCase();
      inExampleBlock = false;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const subsection = trimmed.replace('### ', '').toLowerCase();
      if (subsection.includes('good')) {
        inExampleBlock = true;
        exampleType = 'good';
      } else if (subsection.includes('bad')) {
        inExampleBlock = true;
        exampleType = 'bad';
      }
      continue;
    }

    if (trimmed.startsWith('- ') && currentSection) {
      const item = trimmed.replace('- ', '');

      if (currentSection.includes('core truth')) {
        config.coreTruths.push(item);
      } else if (currentSection.includes('value')) {
        config.values.push(item);
      } else if (currentSection.includes('boundar')) {
        config.boundaries.push(item);
      } else if (currentSection.includes('anti-pattern')) {
        config.antiPatterns.push(item);
      } else if (currentSection.includes('communication')) {
        if (item.includes('Tone:')) {
          config.communicationStyle.tone = item.replace('Tone:', '').trim() as SoulConfig['communicationStyle']['tone'];
        } else if (item.includes('Verbosity:')) {
          config.communicationStyle.verbosity = item.replace('Verbosity:', '').trim() as SoulConfig['communicationStyle']['verbosity'];
        } else if (item.includes('Humor:')) {
          const level = parseInt(item.replace('Humor:', '').trim().replace('/10', ''));
          config.communicationStyle.humorLevel = isNaN(level) ? 3 : level;
        } else if (item.includes('Formality:')) {
          config.communicationStyle.formality = item.replace('Formality:', '').trim() as SoulConfig['communicationStyle']['formality'];
        }
      }
    }

    if (inExampleBlock && exampleType && trimmed.startsWith('>')) {
      config.exampleResponses[exampleType].push(trimmed.replace('>', '').trim());
    }
  }

  return config;
}

export function serializeSoul(config: SoulConfig): string {
  return `# SOUL.md

## Core Truths

${config.coreTruths.map((t) => `- ${t}`).join('\n') || '- I am a helpful AI assistant'}

## Communication Style

- Tone: ${config.communicationStyle.tone}
- Verbosity: ${config.communicationStyle.verbosity}
- Humor: ${config.communicationStyle.humorLevel}/10
- Formality: ${config.communicationStyle.formality}

## Values

${config.values.map((v) => `- ${v}`).join('\n') || '- Accuracy and reliability'}

## Boundaries

${config.boundaries.map((b) => `- ${b}`).join('\n') || '- Never generate harmful content'}

## Anti-Patterns

${config.antiPatterns.map((a) => `- ${a}`).join('\n') || '- Never say "it depends" without explanation'}

## Example Responses

### Good

${config.exampleResponses.good.map((r) => `> ${r}`).join('\n') || '> Here is a solution that addresses X by doing Y, which provides Z benefit.'}

### Bad

${config.exampleResponses.bad.map((r) => `> ${r}`).join('\n') || '> Here is some code.'}
`;
}

// ============================================
// AGENTS.md Parser
// ============================================

export function parseAgents(content: string): AgentsConfig {
  const lines = content.split('\n');
  const config: AgentsConfig = {
    role: '',
    workflow: { steps: [] },
    codeStandards: {
      language: 'TypeScript',
      stylePreferences: [],
      testingPolicy: 'after',
      documentationPolicy: 'inline',
    },
    decisionFramework: {
      performanceBottleneck: '',
      newFeature: '',
      bugFix: '',
      technicalDebt: '',
      securityIssue: '',
    },
    responseGuidelines: {
      maxLength: 300,
      requireCodeExamples: true,
      includeTradeoffs: true,
      errorHandlingRequired: true,
      askClarifyingQuestions: true,
    },
    prohibitedOperations: [],
  };

  let currentSection: string | null = null;
  let stepOrder = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').toLowerCase();
      continue;
    }

    if (currentSection === 'role' && trimmed && !trimmed.startsWith('#')) {
      config.role = trimmed;
    }

    if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || 
        trimmed.startsWith('4. ') || trimmed.startsWith('5. ')) {
      const match = trimmed.match(/^\d+\.\s+(.+)$/);
      if (match && currentSection?.includes('workflow')) {
        config.workflow.steps.push({
          order: stepOrder++,
          title: match[1].split('→')[0].trim(),
          description: match[1],
        });
      }
    }

    if (trimmed.startsWith('- ') && currentSection) {
      const item = trimmed.replace('- ', '');

      if (currentSection.includes('code standard')) {
        if (item.includes('Language:')) {
          config.codeStandards.language = item.replace('Language:', '').trim();
        } else if (item.includes('Testing:')) {
          config.codeStandards.testingPolicy = item.replace('Testing:', '').trim() as AgentsConfig['codeStandards']['testingPolicy'];
        } else {
          config.codeStandards.stylePreferences.push(item);
        }
      } else if (currentSection.includes('decision')) {
        if (item.includes('Performance:')) {
          config.decisionFramework.performanceBottleneck = item.replace('Performance:', '').trim();
        } else if (item.includes('New feature:')) {
          config.decisionFramework.newFeature = item.replace('New feature:', '').trim();
        } else if (item.includes('Bug fix:')) {
          config.decisionFramework.bugFix = item.replace('Bug fix:', '').trim();
        } else if (item.includes('Tech debt:')) {
          config.decisionFramework.technicalDebt = item.replace('Tech debt:', '').trim();
        } else if (item.includes('Security:')) {
          config.decisionFramework.securityIssue = item.replace('Security:', '').trim();
        }
      } else if (currentSection.includes('response')) {
        if (item.includes('Max length:')) {
          const length = parseInt(item.replace('Max length:', '').trim());
          config.responseGuidelines.maxLength = isNaN(length) ? 300 : length;
        } else if (item.includes('Code examples:')) {
          config.responseGuidelines.requireCodeExamples = item.includes('yes');
        } else if (item.includes('Tradeoffs:')) {
          config.responseGuidelines.includeTradeoffs = item.includes('yes');
        }
      } else if (currentSection.includes('prohibited')) {
        config.prohibitedOperations.push(item);
      }
    }
  }

  return config;
}

export function serializeAgents(config: AgentsConfig): string {
  return `# AGENTS.md

## Role

${config.role || 'AI development assistant'}

## Workflow

${config.workflow.steps.map((s) => `${s.order}. ${s.title} → ${s.description}`).join('\n') || '1. Understand → Ask clarifying questions\n2. Design → Propose approach with trade-offs\n3. Implement → Write code following standards\n4. Test → Verify the solution works\n5. Review → Explain what was done and why'}

## Code Standards

- Language: ${config.codeStandards.language}
- Testing: ${config.codeStandards.testingPolicy}
${config.codeStandards.stylePreferences.map((p) => `- ${p}`).join('\n')}

## Decision Framework

- Performance: ${config.decisionFramework.performanceBottleneck || 'Profile first, optimize second'}
- New feature: ${config.decisionFramework.newFeature || 'Start with tests, then implement'}
- Bug fix: ${config.decisionFramework.bugFix || 'Write failing test first, then fix'}
- Tech debt: ${config.decisionFramework.technicalDebt || 'Document and schedule cleanup'}
- Security: ${config.decisionFramework.securityIssue || 'Prioritize and fix immediately'}

## Response Guidelines

- Max length: ${config.responseGuidelines.maxLength} words
- Code examples: ${config.responseGuidelines.requireCodeExamples ? 'yes' : 'no'}
- Tradeoffs: ${config.responseGuidelines.includeTradeoffs ? 'yes' : 'no'}
- Error handling: ${config.responseGuidelines.errorHandlingRequired ? 'required' : 'optional'}
- Ask clarifying: ${config.responseGuidelines.askClarifyingQuestions ? 'yes' : 'no'}

## Prohibited Operations

${config.prohibitedOperations.map((p) => `- ${p}`).join('\n') || '- rm -rf without confirmation\n- git push --force\n- DROP TABLE without backup'}
`;
}

// ============================================
// USER.md Parser
// ============================================

export function parseUser(content: string): UserConfig {
  const lines = content.split('\n');
  const config: UserConfig = {
    profile: {
      name: '',
      role: '',
      timezone: 'UTC',
      workingHours: { start: '09:00', end: '17:00' },
      preferredContact: 'Telegram',
    },
    technicalStack: {
      proficient: [],
      learning: [],
      notFamiliar: [],
    },
    currentProjects: [],
    preferences: {
      communicationStyle: 'direct',
      codeReviewStyle: 'thorough',
      meetingPreference: 'async',
    },
  };

  let currentSection: string | null = null;
  let currentProject: Partial<Project> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').toLowerCase();
      continue;
    }

    if (trimmed.startsWith('- ') && currentSection) {
      const item = trimmed.replace('- ', '');

      if (currentSection.includes('profile') || currentSection.includes('about')) {
        if (item.includes('Name:')) {
          config.profile.name = item.replace('Name:', '').trim();
        } else if (item.includes('Role:')) {
          config.profile.role = item.replace('Role:', '').trim();
        } else if (item.includes('Company:')) {
          config.profile.company = item.replace('Company:', '').trim();
        } else if (item.includes('Timezone:')) {
          config.profile.timezone = item.replace('Timezone:', '').trim();
        } else if (item.includes('Working hours:')) {
          const hours = item.replace('Working hours:', '').trim().split('-');
          if (hours.length === 2) {
            config.profile.workingHours.start = hours[0].trim();
            config.profile.workingHours.end = hours[1].trim();
          }
        } else if (item.includes('Preferred contact:')) {
          config.profile.preferredContact = item.replace('Preferred contact:', '').trim();
        }
      } else if (currentSection.includes('proficient')) {
        config.technicalStack.proficient.push(item);
      } else if (currentSection.includes('learning')) {
        config.technicalStack.learning.push(item);
      } else if (currentSection.includes('not familiar')) {
        config.technicalStack.notFamiliar.push(item);
      } else if (currentSection.includes('preference')) {
        if (item.includes('Communication:')) {
          config.preferences.communicationStyle = item.replace('Communication:', '').trim();
        } else if (item.includes('Code review:')) {
          config.preferences.codeReviewStyle = item.replace('Code review:', '').trim() as UserConfig['preferences']['codeReviewStyle'];
        } else if (item.includes('Meetings:')) {
          config.preferences.meetingPreference = item.replace('Meetings:', '').trim() as UserConfig['preferences']['meetingPreference'];
        }
      }
    }

    if (trimmed.startsWith('### ') && currentSection?.includes('project')) {
      if (currentProject) {
        config.currentProjects.push(currentProject as Project);
      }
      currentProject = {
        name: trimmed.replace('### ', '').trim(),
        status: 'active',
      };
    }

    if (currentProject && trimmed.startsWith('- ')) {
      const item = trimmed.replace('- ', '');
      if (item.includes('Description:')) {
        currentProject.description = item.replace('Description:', '').trim();
      } else if (item.includes('Stack:')) {
        currentProject.stack = item.replace('Stack:', '').trim().split(',').map((s) => s.trim());
      } else if (item.includes('Status:')) {
        currentProject.status = item.replace('Status:', '').trim() as Project['status'];
      }
    }
  }

  if (currentProject) {
    config.currentProjects.push(currentProject as Project);
  }

  return config;
}

export function serializeUser(config: UserConfig): string {
  return `# USER.md

## Profile

- Name: ${config.profile.name}
- Role: ${config.profile.role}
${config.profile.company ? `- Company: ${config.profile.company}` : ''}
- Timezone: ${config.profile.timezone}
- Working hours: ${config.profile.workingHours.start}-${config.profile.workingHours.end}
- Preferred contact: ${config.profile.preferredContact}

## Technical Stack

### Proficient In

${config.technicalStack.proficient.map((t) => `- ${t}`).join('\n') || '- JavaScript, TypeScript'}

### Learning

${config.technicalStack.learning.map((t) => `- ${t}`).join('\n') || '- New technologies'}

### Not Familiar With

${config.technicalStack.notFamiliar.map((t) => `- ${t}`).join('\n') || '- Legacy systems'}

## Current Projects

${config.currentProjects.map((p) => `### ${p.name}

- Description: ${p.description}
- Stack: ${p.stack?.join(', ')}
- Status: ${p.status}
`).join('\n') || '### Sample Project\n\n- Description: A sample project\n- Stack: TypeScript, React\n- Status: active'}

## Preferences

- Communication: ${config.preferences.communicationStyle}
- Code review: ${config.preferences.codeReviewStyle}
- Meetings: ${config.preferences.meetingPreference}
`;
}

// ============================================
// HEARTBEAT.md Parser
// ============================================

export function parseHeartbeat(content: string): HeartbeatConfig {
  const lines = content.split('\n');
  const config: HeartbeatConfig = {
    enabled: true,
    interval: '30m',
    activeHours: {
      enabled: true,
      start: '08:00',
      end: '22:00',
    },
    checklist: [],
    responseRules: {
      silentCondition: 'Nothing urgent found',
      alertCondition: 'Critical issue detected',
      digestInterval: '4h',
    },
  };

  let currentSection: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').toLowerCase();
      continue;
    }

    if (trimmed.startsWith('- ') && currentSection) {
      const item = trimmed.replace('- ', '');

      if (currentSection.includes('checklist')) {
        const emoji = item.match(/^(.?)\s+/)?.[1] || '📋';
        const task = item.replace(/^(.?)\s+/, '');
        config.checklist.push({
          id: `check-${config.checklist.length}`,
          emoji,
          task,
          priority: 'medium',
          enabled: true,
        });
      } else if (currentSection.includes('response')) {
        if (item.includes('Silent:')) {
          config.responseRules.silentCondition = item.replace('Silent:', '').trim();
        } else if (item.includes('Alert:')) {
          config.responseRules.alertCondition = item.replace('Alert:', '').trim();
        } else if (item.includes('Digest:')) {
          config.responseRules.digestInterval = item.replace('Digest:', '').trim();
        }
      } else if (currentSection.includes('schedule')) {
        if (item.includes('Interval:')) {
          config.interval = item.replace('Interval:', '').trim();
        } else if (item.includes('Active hours:')) {
          const hours = item.replace('Active hours:', '').trim().split('-');
          if (hours.length === 2) {
            config.activeHours.start = hours[0].trim();
            config.activeHours.end = hours[1].trim();
            config.activeHours.enabled = true;
          }
        }
      }
    }
  }

  return config;
}

export function serializeHeartbeat(config: HeartbeatConfig): string {
  return `# HEARTBEAT.md

## Monitoring Checklist

${config.checklist.filter((c) => c.enabled).map((c) => `- ${c.emoji} ${c.task}`).join('\n') || '- 📧 Check inbox for urgent emails\n- 📅 Review calendar for upcoming meetings\n- 🔥 Check for critical system alerts'}

## Response Rules

- Silent: ${config.responseRules.silentCondition}
- Alert: ${config.responseRules.alertCondition}
- Digest: ${config.responseRules.digestInterval}

## Schedule

- Interval: ${config.interval}
- Active hours: ${config.activeHours.start}-${config.activeHours.end}
`;
}
