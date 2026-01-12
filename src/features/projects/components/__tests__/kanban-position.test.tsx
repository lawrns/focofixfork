import { generateKeyBetween } from 'fractional-indexing'

describe('Kanban Position with Fractional Indexing', () => {
  it('should generate fractional index for first task', () => {
    const position = generateKeyBetween(null, null)
    expect(position).toBeDefined()
    expect(typeof position).toBe('string')
  })

  it('should generate fractional index between two tasks', () => {
    const firstPosition = generateKeyBetween(null, null)
    const secondPosition = generateKeyBetween(firstPosition, null)
    const betweenPosition = generateKeyBetween(firstPosition, secondPosition)

    expect(betweenPosition).toBeDefined()
    expect(typeof betweenPosition).toBe('string')
    expect(betweenPosition > firstPosition).toBe(true)
    expect(betweenPosition < secondPosition).toBe(true)
  })

  it('should generate fractional index at the beginning', () => {
    const firstPosition = generateKeyBetween(null, null)
    const beforePosition = generateKeyBetween(null, firstPosition)

    expect(beforePosition).toBeDefined()
    expect(typeof beforePosition).toBe('string')
    expect(beforePosition < firstPosition).toBe(true)
  })

  it('should generate fractional index at the end', () => {
    const firstPosition = generateKeyBetween(null, null)
    const secondPosition = generateKeyBetween(firstPosition, null)

    expect(secondPosition).toBeDefined()
    expect(typeof secondPosition).toBe('string')
    expect(secondPosition > firstPosition).toBe(true)
  })

  it('should maintain order when sorting by fractional positions', () => {
    const positions = []
    positions.push(generateKeyBetween(null, null)) // a0
    positions.push(generateKeyBetween(positions[0], null)) // a1
    positions.push(generateKeyBetween(positions[0], positions[1])) // between a0 and a1

    const sorted = [...positions].sort()

    // After sorting, the middle position should be between first and last
    expect(sorted[0]).toBe(positions[0])
    expect(sorted[1]).toBe(positions[2])
    expect(sorted[2]).toBe(positions[1])
  })
})
