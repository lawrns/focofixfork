import fs from 'node:fs/promises'
import path from 'node:path'
import { glob } from 'glob'

const SESSIONS_DIR = path.join(process.env.HOME ?? '~', '.openclaw', 'agents', 'main', 'sessions')

interface SessionData {
  path: string
  assistant_output: string | null
  tool_markers: string[]
  cwd: string | null
  messages: unknown[]
}

interface ToolCallFunction {
  name?: string
}

interface ToolCall {
  function?: ToolCallFunction
}

function homeDir(): string {
  return process.env.HOME ?? '/tmp'
}

async function readJsonlFile(filePath: string): Promise<Record<string, unknown>[]> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const lines = content.split('\n').filter(line => line.trim())
    return lines.map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return {}
      }
    })
  } catch {
    return []
  }
}

function findAssistantOutput(messages: unknown[]): string | null {
  // Look for assistant messages in the session
  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) continue
    const m = msg as Record<string, unknown>
    if (m.role === 'assistant' && typeof m.content === 'string') {
      return m.content
    }
  }
  return null
}

function findToolMarkers(messages: unknown[]): string[] {
  const markers: string[] = []
  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) continue
    const m = msg as Record<string, unknown>
    
    // Check for tool_calls in assistant messages
    if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
      for (const tc of m.tool_calls) {
        if (typeof tc === 'object' && tc !== null) {
          const tool = tc as ToolCall
          const fnName = tool.function?.name
          if (typeof fnName === 'string') {
            markers.push(`call:${fnName}`)
          }
        }
      }
    }
    
    // Check for tool responses
    const msgName = m.name
    if (m.role === 'tool' && typeof msgName === 'string') {
      markers.push(`result:${msgName}`)
    }
  }
  return markers
}

function findCwd(messages: unknown[]): string | null {
  // Try to find cwd from context in messages
  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) continue
    const m = msg as Record<string, unknown>
    const ctx = m.context as Record<string, unknown> | undefined
    if (ctx?.cwd) {
      return String(ctx.cwd)
    }
    // Also check in content for cwd patterns
    if (typeof m.content === 'string') {
      const match = m.content.match(/cwd[:\s]+([^\s]+)/i)
      if (match) return match[1]
    }
  }
  return null
}

export async function resolveSessionFromDisk(
  runId: string,
  correlationId: string
): Promise<SessionData | null> {
  try {
    // Find all jsonl files in sessions directory
    const sessionFiles = await glob('*.jsonl', { cwd: SESSIONS_DIR, absolute: true })
    
    for (const filePath of sessionFiles) {
      const entries = await readJsonlFile(filePath)
      
      // Look for matching run_id or correlation_id in any entry
      let matched = false
      let messages: unknown[] = []
      
      for (const entry of entries) {
        // Check for run_id or correlation_id match
        const entryRunId = entry.run_id ?? entry.runId
        const entryCorrelationId = entry.correlation_id ?? entry.correlationId
        
        if (entryRunId === runId || entryCorrelationId === correlationId) {
          matched = true
        }
        
        // Also check in the prompt/content
        const content = entry.content ?? entry.task ?? entry.prompt ?? ''
        if (typeof content === 'string') {
          if (content.includes(runId) || content.includes(correlationId)) {
            matched = true
          }
        }
        
        // Collect messages if available
        if (entry.messages && Array.isArray(entry.messages)) {
          messages = entry.messages
        } else if (entry.message && typeof entry.message === 'object') {
          messages.push(entry.message)
        }
      }
      
      if (matched) {
        // Re-read to get full messages if we only got partial data
        if (messages.length === 0 && entries.length > 0) {
          const lastEntry = entries[entries.length - 1]
          if (lastEntry.messages && Array.isArray(lastEntry.messages)) {
            messages = lastEntry.messages
          }
        }
        
        return {
          path: filePath,
          assistant_output: findAssistantOutput(messages),
          tool_markers: findToolMarkers(messages),
          cwd: findCwd(messages),
          messages: messages.slice(-10), // Last 10 messages for brevity
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}
