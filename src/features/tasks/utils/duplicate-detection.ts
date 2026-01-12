/**
 * String similarity utility using Levenshtein distance
 * Returns a similarity score between 0 and 1 (1 = identical)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1

  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.length === 0) return 1
  if (shorter.length === 0) return 0

  const editDistance = getLevenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

/**
 * Calculate Levenshtein distance between two strings
 */
function getLevenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = []

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }

  return costs[s2.length]
}

export interface Task {
  id: string
  title: string
  project_id: string
}

export interface DuplicateMatch {
  task: Task
  similarity: number
}

/**
 * Find similar tasks within the same project
 * Returns tasks that are 90% or more similar to the given title
 */
export function findSimilarTasks(
  title: string,
  projectId: string,
  tasks: Task[],
  threshold: number = 0.9
): DuplicateMatch[] {
  return tasks
    .filter((task) => task.project_id === projectId)
    .map((task) => ({
      task,
      similarity: calculateStringSimilarity(title, task.title),
    }))
    .filter((match) => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
}

/**
 * Check if a title is a likely duplicate (90%+ similar)
 */
export function isLikelyDuplicate(
  title: string,
  projectId: string,
  tasks: Task[],
  threshold: number = 0.9
): boolean {
  return findSimilarTasks(title, projectId, tasks, threshold).length > 0
}
