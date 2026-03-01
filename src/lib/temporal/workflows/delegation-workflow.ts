/**
 * Delegation Workflow
 * 
 * Heartbeat loop every 30s
 * Calls /api/delegation/process
 * Handles retries and failures
 * 
 * Note: This is a lightweight implementation that can be run via:
 * 1. Next.js cron job (preferred)
 * 2. External cron calling the API
 * 3. Temporal integration (when @temporalio packages are added)
 */

const DEFAULT_INTERVAL_MS = 30000 // 30 seconds
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

export interface WorkflowConfig {
  apiUrl: string
  intervalMs: number
  maxRetries: number
  serviceToken?: string
}

export interface WorkflowStatus {
  isRunning: boolean
  lastTick: Date | null
  lastError: string | null
  consecutiveFailures: number
  totalTicks: number
  totalProcessed: number
}

/**
 * Default workflow configuration
 */
export function getDefaultConfig(): WorkflowConfig {
  return {
    apiUrl: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/delegation/process`
      : 'http://localhost:3000/api/delegation/process',
    intervalMs: DEFAULT_INTERVAL_MS,
    maxRetries: MAX_RETRIES,
    serviceToken: process.env.DELEGATION_SERVICE_TOKEN
  }
}

/**
 * Execute a single delegation tick
 */
export async function executeTick(config: WorkflowConfig): Promise<{
  success: boolean
  processed: number
  error?: string
}> {
  let retries = 0
  
  while (retries <= config.maxRetries) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (config.serviceToken) {
        headers['Authorization'] = `Bearer ${config.serviceToken}`
      }

      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(60000) // 60 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      return {
        success: true,
        processed: result.processed || 0
      }

    } catch (error) {
      retries++
      const message = error instanceof Error ? error.message : 'Unknown error'
      
      if (retries > config.maxRetries) {
        return {
          success: false,
          processed: 0,
          error: `Failed after ${retries} retries: ${message}`
        }
      }

      // Wait before retry
      await sleep(RETRY_DELAY_MS)
    }
  }

  return {
    success: false,
    processed: 0,
    error: 'Max retries exceeded'
  }
}

/**
 * Run the delegation workflow loop
 * This function runs indefinitely until aborted
 */
export async function* runDelegationWorkflow(
  config: WorkflowConfig = getDefaultConfig(),
  signal?: AbortSignal
): AsyncGenerator<WorkflowStatus, void, unknown> {
  const status: WorkflowStatus = {
    isRunning: true,
    lastTick: null,
    lastError: null,
    consecutiveFailures: 0,
    totalTicks: 0,
    totalProcessed: 0
  }

  while (!signal?.aborted) {
    // Execute tick
    const tickStart = Date.now()
    const result = await executeTick(config)
    const tickDuration = Date.now() - tickStart

    // Update status
    status.lastTick = new Date()
    status.totalTicks++

    if (result.success) {
      status.consecutiveFailures = 0
      status.lastError = null
      status.totalProcessed += result.processed
    } else {
      status.consecutiveFailures++
      status.lastError = result.error || 'Unknown error'
      
      console.error(`Delegation tick failed (${status.consecutiveFailures} consecutive):`, result.error)
    }

    // Yield current status
    yield { ...status }

    // Check if we should continue
    if (signal?.aborted) break

    // Calculate sleep time (account for tick duration)
    const sleepTime = Math.max(0, config.intervalMs - tickDuration)
    await sleep(sleepTime, signal)
  }

  status.isRunning = false
  yield { ...status }
}

/**
 * Simple sleep function that respects abort signal
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }

    const timeout = setTimeout(resolve, ms)

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout)
        resolve()
      }, { once: true })
    }
  })
}

/**
 * Create a managed workflow instance
 */
export class DelegationWorkflowManager {
  private config: WorkflowConfig
  private abortController: AbortController | null = null
  private status: WorkflowStatus = {
    isRunning: false,
    lastTick: null,
    lastError: null,
    consecutiveFailures: 0,
    totalTicks: 0,
    totalProcessed: 0
  }
  private onStatusChange?: (status: WorkflowStatus) => void

  constructor(
    config?: Partial<WorkflowConfig>,
    onStatusChange?: (status: WorkflowStatus) => void
  ) {
    this.config = { ...getDefaultConfig(), ...config }
    this.onStatusChange = onStatusChange
  }

  /**
   * Start the workflow
   */
  async start(): Promise<void> {
    if (this.abortController) {
      throw new Error('Workflow already running')
    }

    this.abortController = new AbortController()
    
    for await (const status of runDelegationWorkflow(this.config, this.abortController.signal)) {
      this.status = status
      this.onStatusChange?.(status)
      
      if (!status.isRunning) break
    }
  }

  /**
   * Stop the workflow
   */
  stop(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  /**
   * Get current status
   */
  getStatus(): WorkflowStatus {
    return { ...this.status }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * Singleton workflow instance for server-side use
 */
let globalWorkflow: DelegationWorkflowManager | null = null

/**
 * Start global delegation workflow
 */
export function startGlobalDelegationWorkflow(
  config?: Partial<WorkflowConfig>,
  onStatusChange?: (status: WorkflowStatus) => void
): DelegationWorkflowManager {
  if (globalWorkflow) {
    return globalWorkflow
  }

  globalWorkflow = new DelegationWorkflowManager(config, onStatusChange)
  
  // Start in background (don't await)
  globalWorkflow.start().catch(error => {
    console.error('Global delegation workflow error:', error)
  })

  return globalWorkflow
}

/**
 * Stop global delegation workflow
 */
export function stopGlobalDelegationWorkflow(): void {
  globalWorkflow?.stop()
  globalWorkflow = null
}

/**
 * Get global workflow status
 */
export function getGlobalWorkflowStatus(): WorkflowStatus | null {
  return globalWorkflow?.getStatus() || null
}

const delegationWorkflowModule = {
  executeTick,
  runDelegationWorkflow,
  DelegationWorkflowManager,
  startGlobalDelegationWorkflow,
  stopGlobalDelegationWorkflow,
  getGlobalWorkflowStatus
}

export default delegationWorkflowModule
