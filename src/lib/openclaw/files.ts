/**
 * OpenClaw Workspace File System Utilities
 * Handles reading and writing to ~/.openclaw/workspace/
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { WorkspaceFile, FileContent, PersonalityConfig, SoulConfig, IdentityConfig, UserConfig, AgentsConfig, HeartbeatConfig } from './types';
import {
  parseIdentity,
  parseSoul,
  parseAgents,
  parseUser,
  parseHeartbeat,
  serializeIdentity,
  serializeSoul,
  serializeAgents,
  serializeUser,
  serializeHeartbeat,
} from './parser';

// Default workspace path
const DEFAULT_OPENCLAW_DIR = path.join(process.env.HOME || '/tmp', '.openclaw');
const WORKSPACE_DIR = path.join(DEFAULT_OPENCLAW_DIR, 'workspace');

// Maximum characters per bootstrap file (OpenClaw default)
const MAX_FILE_CHARS = 20000;

/**
 * Get the OpenClaw workspace directory path
 */
export function getWorkspacePath(): string {
  return process.env.OPENCLAW_WORKSPACE_PATH || WORKSPACE_DIR;
}

/**
 * Ensure workspace directory exists
 */
export async function ensureWorkspace(): Promise<void> {
  const workspace = getWorkspacePath();
  try {
    await fs.mkdir(workspace, { recursive: true });
  } catch (error) {
    console.error('Failed to create workspace directory:', error);
    throw new Error('Failed to initialize OpenClaw workspace');
  }
}

/**
 * List all workspace files with metadata
 */
export async function listWorkspaceFiles(): Promise<WorkspaceFile[]> {
  const workspace = getWorkspacePath();
  const files: WorkspaceFile[] = [];

  try {
    const entries = await fs.readdir(workspace, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(workspace, entry.name);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf8');

        files.push({
          filename: entry.name,
          path: filePath,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          charCount: content.length,
          truncated: content.length > MAX_FILE_CHARS,
        });
      }
    }

    return files.sort((a, b) => a.filename.localeCompare(b.filename));
  } catch (error) {
    // If directory doesn't exist, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Read a specific workspace file
 */
export async function readWorkspaceFile(filename: string): Promise<FileContent> {
  const workspace = getWorkspacePath();
  const filePath = path.join(workspace, filename);

  // Security: ensure file is within workspace
  if (!filePath.startsWith(workspace)) {
    throw new Error('Invalid file path');
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);

    return {
      content,
      metadata: {
        filename,
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        charCount: content.length,
        truncated: content.length > MAX_FILE_CHARS,
      },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Return empty content for new files
      return {
        content: '',
        metadata: {
          filename,
          path: filePath,
          size: 0,
          lastModified: new Date().toISOString(),
          charCount: 0,
          truncated: false,
        },
      };
    }
    throw error;
  }
}

/**
 * Write a workspace file
 */
export async function writeWorkspaceFile(
  filename: string,
  content: string
): Promise<WorkspaceFile> {
  const workspace = getWorkspacePath();
  const filePath = path.join(workspace, filename);

  // Security: ensure file is within workspace
  if (!filePath.startsWith(workspace)) {
    throw new Error('Invalid file path');
  }

  // Ensure workspace exists
  await ensureWorkspace();

  // Write file
  await fs.writeFile(filePath, content, 'utf8');

  const stats = await fs.stat(filePath);

  return {
    filename,
    path: filePath,
    size: stats.size,
    lastModified: stats.mtime.toISOString(),
    charCount: content.length,
    truncated: content.length > MAX_FILE_CHARS,
  };
}

/**
 * Delete a workspace file
 */
export async function deleteWorkspaceFile(filename: string): Promise<void> {
  const workspace = getWorkspacePath();
  const filePath = path.join(workspace, filename);

  // Security: ensure file is within workspace
  if (!filePath.startsWith(workspace)) {
    throw new Error('Invalid file path');
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Load complete personality configuration from all files
 */
export async function loadPersonalityConfig(): Promise<PersonalityConfig> {
  const [identityRaw, soulRaw, agentsRaw, userRaw, heartbeatRaw] = await Promise.all([
    readWorkspaceFile('IDENTITY.md'),
    readWorkspaceFile('SOUL.md'),
    readWorkspaceFile('AGENTS.md'),
    readWorkspaceFile('USER.md'),
    readWorkspaceFile('HEARTBEAT.md'),
  ]);

  return {
    identity: identityRaw.content ? parseIdentity(identityRaw.content) : getDefaultIdentity(),
    soul: soulRaw.content ? parseSoul(soulRaw.content) : getDefaultSoul(),
    agents: agentsRaw.content ? parseAgents(agentsRaw.content) : getDefaultAgents(),
    user: userRaw.content ? parseUser(userRaw.content) : getDefaultUser(),
    heartbeat: heartbeatRaw.content ? parseHeartbeat(heartbeatRaw.content) : getDefaultHeartbeat(),
  };
}

/**
 * Save complete personality configuration to all files
 */
export async function savePersonalityConfig(config: PersonalityConfig): Promise<void> {
  await Promise.all([
    writeWorkspaceFile('IDENTITY.md', serializeIdentity(config.identity)),
    writeWorkspaceFile('SOUL.md', serializeSoul(config.soul)),
    writeWorkspaceFile('AGENTS.md', serializeAgents(config.agents)),
    writeWorkspaceFile('USER.md', serializeUser(config.user)),
    writeWorkspaceFile('HEARTBEAT.md', serializeHeartbeat(config.heartbeat)),
  ]);
}

// ============================================
// Default Configurations
// ============================================

function getDefaultIdentity(): IdentityConfig {
  return {
    name: 'OpenClaw',
    emoji: '🦞',
    theme: 'lobster',
    creature: 'ai',
    tagline: 'Your AI development partner',
  };
}

function getDefaultSoul(): SoulConfig {
  return {
    coreTruths: [
      'I am a proactive AI assistant',
      'I prioritize code quality and maintainability',
      'I believe in explaining my reasoning transparently',
    ],
    communicationStyle: {
      tone: 'professional',
      verbosity: 'balanced',
      humorLevel: 3,
      formality: 'neutral',
    },
    values: [
      'Accuracy over speed',
      'Security-first mindset',
      'Clean, maintainable code',
    ],
    boundaries: [
      'Never generate harmful or malicious code',
      'Do not make assumptions about sensitive data',
      'Always disclose limitations',
    ],
    antiPatterns: [
      'Saying "it depends" without explanation',
      'Providing code without trade-off analysis',
      'Ignoring error handling',
    ],
    exampleResponses: {
      good: [
        'For this API design, I recommend a layered architecture because it separates concerns and makes testing easier.',
      ],
      bad: [
        'Here is some code.',
      ],
    },
  };
}

function getDefaultAgents(): AgentsConfig {
  return {
    role: 'AI development assistant focused on building high-quality software',
    workflow: {
      steps: [
        { order: 1, title: 'Understand', description: 'Ask clarifying questions' },
        { order: 2, title: 'Design', description: 'Propose approach with trade-offs' },
        { order: 3, title: 'Implement', description: 'Write code following standards' },
        { order: 4, title: 'Test', description: 'Verify the solution works' },
        { order: 5, title: 'Review', description: 'Explain what was done and why' },
      ],
    },
    codeStandards: {
      language: 'TypeScript',
      stylePreferences: ['Functional components', 'Strict mode', 'Conventional commits'],
      testingPolicy: 'after',
      documentationPolicy: 'inline',
    },
    decisionFramework: {
      performanceBottleneck: 'Profile first, optimize second',
      newFeature: 'Start with tests, then implement',
      bugFix: 'Write failing test first, then fix',
      technicalDebt: 'Document and schedule cleanup',
      securityIssue: 'Prioritize and fix immediately',
    },
    responseGuidelines: {
      maxLength: 300,
      requireCodeExamples: true,
      includeTradeoffs: true,
      errorHandlingRequired: true,
      askClarifyingQuestions: true,
    },
    prohibitedOperations: [
      'rm -rf without confirmation',
      'git push --force without verification',
      'DROP TABLE without backup',
    ],
  };
}

function getDefaultUser(): UserConfig {
  return {
    profile: {
      name: 'Developer',
      role: 'Software Engineer',
      timezone: 'UTC',
      workingHours: { start: '09:00', end: '17:00' },
      preferredContact: 'Telegram',
    },
    technicalStack: {
      proficient: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      learning: ['Rust', 'WebAssembly'],
      notFamiliar: ['.NET', 'Java Enterprise'],
    },
    currentProjects: [],
    preferences: {
      communicationStyle: 'Direct and efficient',
      codeReviewStyle: 'thorough' as const,
      meetingPreference: 'async' as const,
    },
  };
}

function getDefaultHeartbeat(): HeartbeatConfig {
  return {
    enabled: true,
    interval: '30m',
    activeHours: {
      enabled: true,
      start: '08:00',
      end: '22:00',
    },
    checklist: [
      { id: 'check-0', emoji: '📧', task: 'Check inbox for urgent emails', priority: 'high', enabled: true },
      { id: 'check-1', emoji: '📅', task: 'Review calendar for upcoming meetings', priority: 'medium', enabled: true },
      { id: 'check-2', emoji: '🔥', task: 'Check for critical system alerts', priority: 'high', enabled: true },
    ],
    responseRules: {
      silentCondition: 'Nothing urgent found',
      alertCondition: 'Critical issue detected',
      digestInterval: '4h',
    },
  };
}
