/**
 * Fractional Indexing Implementation
 * Based on the fractional-indexing library approach
 * Allows insertion between items without full reordering
 *
 * See: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
 */

const DEFAULT_START = 'a0'

function getMidpoint(a: string | null, b: string | null): string {
  if (a === null && b === null) {
    return DEFAULT_START
  }

  if (a === null) {
    return insertBefore(b!)
  }

  if (b === null) {
    return insertAfter(a!)
  }

  return insertBetween(a, b)
}

function insertBefore(b: string): string {
  const head = b[0]
  const tail = b.slice(1)

  if (head === 'a') {
    return '0' + b
  }

  if (head === '0') {
    return 'a' + b
  }

  return String.fromCharCode(head.charCodeAt(0) - 1) + 'z' + tail
}

function insertAfter(a: string): string {
  const tail = a.slice(1)
  const head = a[0]

  if (head < 'z') {
    return String.fromCharCode(head.charCodeAt(0) + 1) + '0'
  }

  return a + '0'
}

function insertBetween(a: string, b: string): string {
  let i = 0

  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++
  }

  const aHead = a.slice(0, i)
  const aTail = a.slice(i)
  const bTail = b.slice(i)

  if (aTail === '' && bTail !== '') {
    return aHead + midpoint(bTail[0], null)
  }

  if (bTail === '') {
    return aHead + midpoint(aTail[0], null)
  }

  const aHeadChar = aTail[0]
  const bHeadChar = bTail[0]

  if (aHeadChar === bHeadChar) {
    return aHead + aHeadChar + insertBetween(aTail.slice(1), bTail.slice(1))
  }

  if (aHeadChar < bHeadChar) {
    if (aHeadChar.charCodeAt(0) + 1 === bHeadChar.charCodeAt(0)) {
      return aHead + aHeadChar + 'z'
    }

    return aHead + midpoint(aHeadChar, bHeadChar)
  }

  throw new Error('Invalid fractional index')
}

function midpoint(a: string | null, b: string | null): string {
  if (a === null && b === null) {
    return '5'
  }

  if (b === null) {
    if (a === 'z') {
      return a + '5'
    }

    return String.fromCharCode(a!.charCodeAt(0) + 1)
  }

  if (a === null) {
    if (b === '0') {
      return '0' + midpoint(null, b.slice(1))
    }

    return '0'
  }

  if (a === b) {
    return a + '5'
  }

  if (a > b) {
    [a, b] = [b, a]
  }

  if (a.charCodeAt(0) + 1 === b.charCodeAt(0)) {
    return a + 'z'
  }

  return String.fromCharCode((a.charCodeAt(0) + b.charCodeAt(0)) / 2)
}

export function generateFractionalIndex(
  after: string | null = null,
  before: string | null = null
): string {
  return getMidpoint(after, before)
}

export function generateFractionalIndices(
  count: number,
  after: string | null = null,
  before: string | null = null
): string[] {
  const indices: string[] = []
  let current = after

  for (let i = 0; i < count; i++) {
    const next = generateFractionalIndex(current, before)
    indices.push(next)
    current = next
  }

  return indices
}

export function compareFractionalIndices(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
