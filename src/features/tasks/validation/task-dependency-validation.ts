/**
 * Task Dependency Validation Module
 *
 * Provides comprehensive validation for task dependencies:
 * - Prevents self-dependencies
 * - Detects circular dependencies (direct and indirect)
 * - Prevents duplicate dependencies
 * - Uses depth-first search for cycle detection
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface Dependency {
  work_item_id: string
  depends_on_id: string
}

/**
 * Validates that a task does not depend on itself
 */
export function validateNoDependencyOnSelf(
  taskId: string,
  dependsOnId: string
): ValidationResult {
  if (taskId === dependsOnId) {
    return {
      valid: false,
      error: 'A task cannot depend on itself',
    }
  }

  return { valid: true }
}

/**
 * Builds a dependency graph from a list of dependencies
 * Graph structure: taskId -> Set of tasks it depends on
 */
export function buildDependencyGraph(
  dependencies: Dependency[]
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  // Initialize all tasks in the graph
  dependencies.forEach(dep => {
    if (!graph.has(dep.work_item_id)) {
      graph.set(dep.work_item_id, new Set())
    }
    if (!graph.has(dep.depends_on_id)) {
      graph.set(dep.depends_on_id, new Set())
    }
  })

  // Add edges to the graph
  dependencies.forEach(dep => {
    const deps = graph.get(dep.work_item_id)
    if (deps) {
      deps.add(dep.depends_on_id)
    }
  })

  return graph
}

/**
 * Detects if adding a dependency would create a circular reference
 * Uses depth-first search to find if dependsOnId can reach taskId
 */
export function detectCircularPath(
  graph: Map<string, Set<string>>,
  taskId: string,
  dependsOnId: string
): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    const dependencies = graph.get(nodeId)
    if (dependencies) {
      for (const depId of dependencies) {
        // If we reach back to taskId, we found a cycle
        if (depId === taskId) {
          return true
        }

        // If not visited, continue DFS
        if (!visited.has(depId)) {
          if (hasCycle(depId)) {
            return true
          }
        }
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  // Check if there's a path from dependsOnId to taskId
  return hasCycle(dependsOnId)
}

/**
 * Validates that adding a dependency would not create a circular reference
 */
export function validateNoCircularDependency(
  taskId: string,
  dependsOnId: string,
  existingDependencies: Dependency[]
): ValidationResult {
  // Build the dependency graph including the new dependency
  const graph = buildDependencyGraph(existingDependencies)

  // Add the new dependency to check if it creates a cycle
  if (!graph.has(taskId)) {
    graph.set(taskId, new Set())
  }
  if (!graph.has(dependsOnId)) {
    graph.set(dependsOnId, new Set())
  }

  // Check if adding this dependency would create a cycle
  // We need to check if dependsOnId can reach taskId through existing dependencies
  if (detectCircularPath(graph, taskId, dependsOnId)) {
    return {
      valid: false,
      error: `Creating this dependency would result in a circular dependency. Task ${taskId} would indirectly depend on itself.`,
    }
  }

  return { valid: true }
}

/**
 * Validates that the dependency doesn't already exist
 */
export function validateNoDependencyConflicts(
  taskId: string,
  dependsOnId: string,
  existingDependencies: Dependency[]
): ValidationResult {
  const dependencyExists = existingDependencies.some(
    dep => dep.work_item_id === taskId && dep.depends_on_id === dependsOnId
  )

  if (dependencyExists) {
    return {
      valid: false,
      error: 'This dependency already exists',
    }
  }

  return { valid: true }
}

/**
 * Comprehensive validation for creating a new dependency
 * Runs all validations and returns the first error encountered
 */
export function canCreateDependency(
  taskId: string,
  dependsOnId: string,
  existingDependencies: Dependency[]
): ValidationResult {
  // Check 1: No self-dependencies
  const selfDepCheck = validateNoDependencyOnSelf(taskId, dependsOnId)
  if (!selfDepCheck.valid) {
    return selfDepCheck
  }

  // Check 2: No circular dependencies
  const circularCheck = validateNoCircularDependency(
    taskId,
    dependsOnId,
    existingDependencies
  )
  if (!circularCheck.valid) {
    return circularCheck
  }

  // Check 3: No duplicate dependencies
  const conflictCheck = validateNoDependencyConflicts(
    taskId,
    dependsOnId,
    existingDependencies
  )
  if (!conflictCheck.valid) {
    return conflictCheck
  }

  return { valid: true }
}

/**
 * Validates multiple dependencies at once (for batch operations)
 */
export function validateDependenciesBatch(
  dependencies: Array<{ taskId: string; dependsOnId: string }>,
  existingDependencies: Dependency[]
): Array<ValidationResult> {
  let workingDependencies = [...existingDependencies]

  return dependencies.map(dep => {
    const result = canCreateDependency(dep.taskId, dep.dependsOnId, workingDependencies)

    // If valid, add to working set for next iteration
    if (result.valid) {
      workingDependencies.push({
        work_item_id: dep.taskId,
        depends_on_id: dep.dependsOnId,
      })
    }

    return result
  })
}
