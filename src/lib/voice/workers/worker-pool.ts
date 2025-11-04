import { EventEmitter } from 'events'

export interface WorkerMessage {
  type: string
  data: any
  id?: string
  timestamp?: number
}

export interface WorkerResponse {
  type: string
  data: any
  error?: string
  originalType?: string
  id?: string
  timestamp?: number
}

export interface WorkerPoolOptions {
  maxWorkers?: number
  workerTimeout?: number
  retryAttempts?: number
  enableProfiling?: boolean
}

/**
 * Web Worker Pool Manager for Voice Processing
 * Manages multiple workers for parallel processing of audio, transcription, and AI tasks
 */
export class VoiceWorkerPool extends EventEmitter {
  private workers: Worker[] = []
  private availableWorkers: Worker[] = []
  private busyWorkers: Set<Worker> = new Set()
  private taskQueue: Array<{
    message: WorkerMessage
    resolve: (response: WorkerResponse) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }> = []
  private options: Required<WorkerPoolOptions>
  private workerScript: string
  private metrics = {
    tasksCompleted: 0,
    tasksFailed: 0,
    averageProcessingTime: 0,
    workerUtilization: 0,
    queueLength: 0
  }

  constructor(workerScript: string, options: WorkerPoolOptions = {}) {
    super()
    
    this.options = {
      maxWorkers: options.maxWorkers || navigator.hardwareConcurrency || 4,
      workerTimeout: options.workerTimeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      enableProfiling: options.enableProfiling || false
    }
    
    this.workerScript = workerScript
    this.initializeWorkers()
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      this.createWorker()
    }
  }

  /**
   * Create a new worker
   */
  private createWorker(): Worker {
    const worker = new Worker(this.workerScript)
    
    worker.addEventListener('message', (event) => {
      this.handleWorkerMessage(worker, event.data)
    })
    
    worker.addEventListener('error', (error) => {
      this.handleWorkerError(worker, error)
    })
    
    this.workers.push(worker)
    this.availableWorkers.push(worker)
    
    this.emit('workerCreated', { workerId: this.workers.length - 1 })
    
    return worker
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    // Find the task that this worker was processing
    const taskIndex = this.taskQueue.findIndex(task => 
      this.busyWorkers.has(worker) && task.message.id === response.id
    )
    
    if (taskIndex === -1) {
      console.warn('Received message from worker with no matching task')
      return
    }

    const task = this.taskQueue[taskIndex]
    clearTimeout(task.timeout)
    this.taskQueue.splice(taskIndex, 1)
    this.busyWorkers.delete(worker)
    this.availableWorkers.push(worker)

    // Update metrics
    if (response.error) {
      this.metrics.tasksFailed++
      this.emit('taskFailed', { response, worker })
    } else {
      this.metrics.tasksCompleted++
      const processingTime = Date.now() - (task.message.timestamp || 0)
      this.updateAverageProcessingTime(processingTime)
      this.emit('taskCompleted', { response, worker, processingTime })
    }

    this.updateMetrics()
    this.processQueue()

    if (response.error) {
      task.reject(new Error(response.error))
    } else {
      task.resolve(response)
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    console.error('Worker error:', error)
    
    // Remove failed worker
    const workerIndex = this.workers.indexOf(worker)
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1)
      this.availableWorkers = this.availableWorkers.filter(w => w !== worker)
      this.busyWorkers.delete(worker)
    }

    // Create replacement worker
    this.createWorker()
    
    this.emit('workerError', { error, workerId: workerIndex })
  }

  /**
   * Execute a task using the worker pool
   */
  public async executeTask(message: WorkerMessage): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const taskMessage = {
        ...message,
        id: this.generateTaskId(),
        timestamp: Date.now()
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Task timeout after ${this.options.workerTimeout}ms`))
      }, this.options.workerTimeout)

      this.taskQueue.push({
        message: taskMessage,
        resolve,
        reject,
        timeout
      })

      this.processQueue()
    })
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    while (this.availableWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.availableWorkers.shift()!
      const task = this.taskQueue.find(t => !this.busyWorkers.has(worker))
      
      if (!task) break
      
      const taskIndex = this.taskQueue.indexOf(task)
      this.taskQueue.splice(taskIndex, 1)
      
      this.busyWorkers.add(worker)
      worker.postMessage(task.message)
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const totalTasks = this.metrics.tasksCompleted + this.metrics.tasksFailed
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (totalTasks - 1) + processingTime) / totalTasks
  }

  /**
   * Update utilization metrics
   */
  private updateMetrics(): void {
    this.metrics.workerUtilization = (this.busyWorkers.size / this.workers.length) * 100
    this.metrics.queueLength = this.taskQueue.length
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current metrics
   */
  public getMetrics() {
    return { ...this.metrics }
  }

  /**
   * Process audio data
   */
  public async processAudio(audioBuffer: AudioBuffer, options: any = {}): Promise<any> {
    const response = await this.executeTask({
      type: 'PROCESS_AUDIO',
      data: { audioBuffer, sampleRate: audioBuffer.sampleRate, options }
    })
    
    if (response.error) {
      throw new Error(response.error)
    }
    
    return response.data
  }

  /**
   * Transcribe audio
   */
  public async transcribeAudio(audioBuffer: AudioBuffer, language = 'en', options: any = {}): Promise<any> {
    const response = await this.executeTask({
      type: 'TRANSCRIBE_AUDIO',
      data: { audioBuffer, language, options, startTime: Date.now() }
    })
    
    if (response.error) {
      throw new Error(response.error)
    }
    
    return response.data
  }

  /**
   * Extract intent from text
   */
  public async extractIntent(text: string, context: any = {}, options: any = {}): Promise<any> {
    const response = await this.executeTask({
      type: 'EXTRACT_INTENT',
      data: { text, context, options, startTime: Date.now() }
    })
    
    if (response.error) {
      throw new Error(response.error)
    }
    
    return response.data
  }

  /**
   * Generate project plan
   */
  public async generatePlan(intent: any, entities: any[], context: any = {}, options: any = {}): Promise<any> {
    const response = await this.executeTask({
      type: 'GENERATE_PLAN',
      data: { intent, entities, context, options, startTime: Date.now() }
    })
    
    if (response.error) {
      throw new Error(response.error)
    }
    
    return response.data
  }

  /**
   * Redact PII from text
   */
  public async redactPII(text: string, options: any = {}): Promise<any> {
    const response = await this.executeTask({
      type: 'REDACT_PII',
      data: { text, options, startTime: Date.now() }
    })
    
    if (response.error) {
      throw new Error(response.error)
    }
    
    return response.data
  }

  /**
   * Encrypt data
   */
  public async encryptData(data: string, keyId: string, options: any = {}): Promise<any> {
    const response = await this.executeTask({
      type: 'ENCRYPT_DATA',
      data: { data, keyId, options, startTime: Date.now() }
    })
    
    if (response.error) {
      throw new Error(response.error)
    }
    
    return response.data
  }

  /**
   * Decrypt data
   */
  public async decryptData(encryptedData: any, options: any = {}): Promise<any> {
    const response = await this.executeTask({
      type: 'DECRYPT_DATA',
      data: { encryptedData, ...options, startTime: Date.now() }
    })
    
    if (response.error) {
      throw new Error(response.error)
    }
    
    return response.data
  }

  /**
   * Process complete voice pipeline
   */
  public async processVoicePipeline(audioBuffer: AudioBuffer, options: any = {}): Promise<any> {
    try {
      // Step 1: Process audio
      const processedAudio = await this.processAudio(audioBuffer, options.audioProcessing)
      
      // Step 2: Transcribe audio
      const transcription = await this.transcribeAudio(audioBuffer, options.language, options.transcription)
      
      // Step 3: Redact PII
      const redaction = await this.redactPII(transcription.text, options.piiRedaction)
      
      // Step 4: Extract intent
      const intent = await this.extractIntent(redaction.redactedText, options.context, options.intentExtraction)
      
      // Step 5: Generate plan
      const plan = await this.generatePlan(intent, redaction.entities, options.context, options.planGeneration)
      
      // Step 6: Encrypt sensitive data
      const encryptedData = await this.encryptData(JSON.stringify(plan), options.keyId || 'default')
      
      return {
        processedAudio,
        transcription,
        redaction,
        intent,
        plan,
        encryptedData,
        metrics: this.getMetrics()
      }
    } catch (error) {
      this.emit('pipelineError', { error, stage: error.stage || 'unknown' })
      throw error
    }
  }

  /**
   * Terminate all workers
   */
  public terminate(): void {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.availableWorkers = []
    this.busyWorkers.clear()
    this.taskQueue.forEach(task => clearTimeout(task.timeout))
    this.taskQueue = []
    
    this.emit('terminated')
  }

  /**
   * Resize worker pool
   */
  public resizePool(newSize: number): void {
    const currentSize = this.workers.length
    
    if (newSize > currentSize) {
      // Add workers
      for (let i = currentSize; i < newSize; i++) {
        this.createWorker()
      }
    } else if (newSize < currentSize) {
      // Remove workers (only idle ones)
      const workersToRemove = Math.min(currentSize - newSize, this.availableWorkers.length)
      for (let i = 0; i < workersToRemove; i++) {
        const worker = this.availableWorkers.pop()!
        worker.terminate()
        const index = this.workers.indexOf(worker)
        this.workers.splice(index, 1)
      }
    }
    
    this.options.maxWorkers = newSize
    this.emit('poolResized', { oldSize: currentSize, newSize })
  }
}

/**
 * Singleton instance for voice worker pool
 */
let voiceWorkerPool: VoiceWorkerPool | null = null

export function getVoiceWorkerPool(): VoiceWorkerPool {
  if (!voiceWorkerPool) {
    const workerScript = new URL('./audio-processor.worker.ts', import.meta.url).toString()
    voiceWorkerPool = new VoiceWorkerPool(workerScript, {
      maxWorkers: navigator.hardwareConcurrency || 4,
      workerTimeout: 30000,
      retryAttempts: 3,
      enableProfiling: true
    })
  }
  
  return voiceWorkerPool
}

/**
 * Cleanup function to terminate worker pool
 */
export function cleanupVoiceWorkerPool(): void {
  if (voiceWorkerPool) {
    voiceWorkerPool.terminate()
    voiceWorkerPool = null
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupVoiceWorkerPool)
}
