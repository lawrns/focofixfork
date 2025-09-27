export interface TaskNode {
  id: string
  name: string
  duration: number // in days
  dependencies: string[] // IDs of prerequisite tasks
  earliestStart: number
  earliestFinish: number
  latestStart: number
  latestFinish: number
  slack: number
  isCritical: boolean
}

export interface CriticalPathResult {
  nodes: TaskNode[]
  criticalPath: string[] // IDs of tasks on the critical path
  projectDuration: number
  criticalTasks: TaskNode[]
  bottlenecks: string[]
  recommendations: string[]
}

/**
 * Critical Path Analysis Service
 * Implements the Critical Path Method (CPM) for project scheduling
 */
export class CriticalPathService {
  /**
   * Analyze project tasks and calculate critical path
   */
  static analyze(tasks: Omit<TaskNode, 'earliestStart' | 'earliestFinish' | 'latestStart' | 'latestFinish' | 'slack' | 'isCritical'>[]): CriticalPathResult {
    // Initialize nodes with calculated values
    const nodes: TaskNode[] = tasks.map(task => ({
      ...task,
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: 0,
      latestFinish: 0,
      slack: 0,
      isCritical: false
    }))

    // Build dependency graph
    const graph = this.buildDependencyGraph(nodes)
    const reverseGraph = this.buildReverseDependencyGraph(nodes)

    // Forward pass - calculate earliest start/finish times
    this.forwardPass(nodes, graph)

    // Find project duration (latest finish time)
    const projectDuration = Math.max(...nodes.map(n => n.earliestFinish))

    // Backward pass - calculate latest start/finish times
    this.backwardPass(nodes, reverseGraph, projectDuration)

    // Calculate slack and identify critical path
    this.calculateSlack(nodes)
    const criticalPath = this.findCriticalPath(nodes, graph)
    const criticalTasks = nodes.filter(n => n.isCritical)

    // Identify bottlenecks and generate recommendations
    const bottlenecks = this.identifyBottlenecks(nodes, criticalPath)
    const recommendations = this.generateRecommendations(nodes, criticalPath, bottlenecks)

    return {
      nodes,
      criticalPath,
      projectDuration,
      criticalTasks,
      bottlenecks,
      recommendations
    }
  }

  /**
   * Build forward dependency graph (task -> dependent tasks)
   */
  private static buildDependencyGraph(nodes: TaskNode[]): Map<string, TaskNode[]> {
    const graph = new Map<string, TaskNode[]>()

    nodes.forEach(node => {
      graph.set(node.id, [])
    })

    nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        const dependents = graph.get(depId) || []
        dependents.push(node)
        graph.set(depId, dependents)
      })
    })

    return graph
  }

  /**
   * Build reverse dependency graph (task <- prerequisite tasks)
   */
  private static buildReverseDependencyGraph(nodes: TaskNode[]): Map<string, TaskNode[]> {
    const reverseGraph = new Map<string, TaskNode[]>()

    nodes.forEach(node => {
      reverseGraph.set(node.id, [])
    })

    nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        const prerequisites = reverseGraph.get(node.id) || []
        const depNode = nodes.find(n => n.id === depId)
        if (depNode) {
          prerequisites.push(depNode)
          reverseGraph.set(node.id, prerequisites)
        }
      })
    })

    return reverseGraph
  }

  /**
   * Forward pass: Calculate earliest start and finish times
   */
  private static forwardPass(nodes: TaskNode[], graph: Map<string, TaskNode[]>): void {
    // Start with tasks that have no dependencies
    const queue = nodes.filter(node => node.dependencies.length === 0)

    while (queue.length > 0) {
      const currentNode = queue.shift()!
      currentNode.earliestFinish = currentNode.earliestStart + currentNode.duration

      // Update dependent tasks
      const dependents = graph.get(currentNode.id) || []
      dependents.forEach(dependent => {
        const prerequisiteFinish = currentNode.earliestFinish
        dependent.earliestStart = Math.max(dependent.earliestStart, prerequisiteFinish)

        // Check if all prerequisites are processed
        const prerequisites = nodes.filter(n => dependent.dependencies.includes(n.id))
        const allPrerequisitesProcessed = prerequisites.every(p => p.earliestFinish > 0)

        if (allPrerequisitesProcessed && !queue.includes(dependent)) {
          queue.push(dependent)
        }
      })
    }
  }

  /**
   * Backward pass: Calculate latest start and finish times
   */
  private static backwardPass(nodes: TaskNode[], reverseGraph: Map<string, TaskNode[]>, projectDuration: number): void {
    // Start with the final tasks (no dependents)
    const queue = nodes.filter(node => {
      const dependents = reverseGraph.get(node.id) || []
      return dependents.length === 0
    })

    // Set latest finish times for end tasks
    queue.forEach(node => {
      node.latestFinish = projectDuration
      node.latestStart = node.latestFinish - node.duration
    })

    const processed = new Set(queue.map(n => n.id))

    while (queue.length > 0) {
      const currentNode = queue.shift()!

      // Update prerequisite tasks
      currentNode.dependencies.forEach(depId => {
        const depNode = nodes.find(n => n.id === depId)
        if (depNode && !processed.has(depId)) {
          depNode.latestFinish = Math.min(depNode.latestFinish || projectDuration, currentNode.latestStart)
          depNode.latestStart = depNode.latestFinish - depNode.duration

          // Check if all dependents are processed
          const dependents = nodes.filter(n => n.dependencies.includes(depId))
          const allDependentsProcessed = dependents.every(d => d.latestFinish > 0)

          if (allDependentsProcessed && !queue.includes(depNode)) {
            queue.push(depNode)
            processed.add(depId)
          }
        }
      })
    }
  }

  /**
   * Calculate slack (float) for each task
   */
  private static calculateSlack(nodes: TaskNode[]): void {
    nodes.forEach(node => {
      node.slack = node.latestStart - node.earliestStart
      node.isCritical = node.slack === 0
    })
  }

  /**
   * Find the critical path through the project
   */
  private static findCriticalPath(nodes: TaskNode[], graph: Map<string, TaskNode[]>): string[] {
    const criticalTasks = nodes.filter(n => n.isCritical)
    const path: string[] = []

    // Start from tasks with no critical dependencies
    let currentTasks = criticalTasks.filter(task =>
      !task.dependencies.some(depId =>
        criticalTasks.some(ct => ct.id === depId)
      )
    )

    while (currentTasks.length > 0) {
      // Sort by earliest start time
      currentTasks.sort((a, b) => a.earliestStart - b.earliestStart)

      const nextTask = currentTasks.shift()!
      path.push(nextTask.id)

      // Find next critical tasks that depend on this one
      const nextCandidates = criticalTasks.filter(task =>
        task.dependencies.includes(nextTask.id) &&
        !path.includes(task.id)
      )

      currentTasks.push(...nextCandidates)
    }

    return path
  }

  /**
   * Identify bottlenecks in the project schedule
   */
  private static identifyBottlenecks(nodes: TaskNode[], criticalPath: string[]): string[] {
    const bottlenecks: string[] = []

    // Tasks with high slack that could become critical
    const highSlackTasks = nodes
      .filter(n => n.slack > 7) // More than a week of slack
      .sort((a, b) => b.slack - a.slack)

    if (highSlackTasks.length > 0) {
      bottlenecks.push(`Tasks with excessive slack: ${highSlackTasks.slice(0, 3).map(t => t.name).join(', ')}`)
    }

    // Long duration tasks on critical path
    const criticalLongTasks = nodes
      .filter(n => criticalPath.includes(n.id) && n.duration > 14) // More than 2 weeks
      .sort((a, b) => b.duration - a.duration)

    if (criticalLongTasks.length > 0) {
      bottlenecks.push(`Long critical path tasks: ${criticalLongTasks.map(t => t.name).join(', ')}`)
    }

    // Tasks with many dependencies
    const complexTasks = nodes
      .filter(n => n.dependencies.length > 3)
      .sort((a, b) => b.dependencies.length - a.dependencies.length)

    if (complexTasks.length > 0) {
      bottlenecks.push(`Complex dependency tasks: ${complexTasks.slice(0, 2).map(t => t.name).join(', ')}`)
    }

    return bottlenecks
  }

  /**
   * Generate recommendations for project optimization
   */
  private static generateRecommendations(nodes: TaskNode[], criticalPath: string[], bottlenecks: string[]): string[] {
    const recommendations: string[] = []

    // Focus on critical path tasks
    if (criticalPath.length > 0) {
      recommendations.push('Focus resources on critical path tasks to prevent project delays')
    }

    // Address bottlenecks
    if (bottlenecks.length > 0) {
      recommendations.push('Review and optimize identified bottlenecks to improve project flow')
    }

    // Parallel processing opportunities
    const parallelTasks = nodes.filter(n => n.slack > 0 && n.dependencies.length === 0)
    if (parallelTasks.length > 0) {
      recommendations.push('Consider starting independent tasks in parallel to reduce overall duration')
    }

    // Resource allocation
    const criticalTasks = nodes.filter(n => n.isCritical)
    if (criticalTasks.length > criticalPath.length * 0.7) {
      recommendations.push('Consider adding resources to critical path tasks to create parallel work streams')
    }

    // Buffer recommendations
    const totalSlack = nodes.reduce((sum, n) => sum + n.slack, 0)
    const averageSlack = totalSlack / nodes.length

    if (averageSlack < 2) {
      recommendations.push('Project has tight scheduling - consider adding buffer time for unexpected delays')
    }

    return recommendations
  }

  /**
   * Get project schedule metrics
   */
  static getScheduleMetrics(result: CriticalPathResult): {
    totalTasks: number
    criticalTasks: number
    longestPath: number
    averageSlack: number
    riskLevel: 'low' | 'medium' | 'high'
  } {
    const totalTasks = result.nodes.length
    const criticalTasks = result.criticalTasks.length
    const longestPath = result.criticalPath.length
    const averageSlack = result.nodes.reduce((sum, n) => sum + n.slack, 0) / totalTasks

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (criticalTasks / totalTasks > 0.6 || averageSlack < 3) {
      riskLevel = 'high'
    } else if (criticalTasks / totalTasks > 0.4 || averageSlack < 5) {
      riskLevel = 'medium'
    }

    return {
      totalTasks,
      criticalTasks,
      longestPath,
      averageSlack: Math.round(averageSlack * 10) / 10,
      riskLevel
    }
  }

  /**
   * Format critical path for display
   */
  static formatCriticalPath(result: CriticalPathResult): string {
    if (result.criticalPath.length === 0) return 'No critical path found'

    const pathNames = result.criticalPath.map(id => {
      const task = result.nodes.find(n => n.id === id)
      return task?.name || id
    })

    return pathNames.join(' → ')
  }
}


