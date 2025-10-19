export interface DragItem {
  id: string
  position: number
  [key: string]: any
}

export interface DropResult {
  sourceIndex: number
  destinationIndex: number
  sourceId: string
  destinationId: string
}

export interface DragState {
  isDragging: boolean
  draggedItem: DragItem | null
  dragOverIndex: number | null
  dragOverId: string | null
}

export class DragHelpers {
  static calculateDropPosition(
    draggedIndex: number,
    hoveredIndex: number,
    items: DragItem[]
  ): number {
    if (draggedIndex === hoveredIndex) {
      return draggedIndex
    }

    // Calculate new position based on drag direction
    if (draggedIndex < hoveredIndex) {
      return hoveredIndex - 1
    } else {
      return hoveredIndex
    }
  }

  static reorderArray<T extends DragItem>(
    items: T[],
    sourceIndex: number,
    destinationIndex: number
  ): T[] {
    const result = Array.from(items)
    const [removed] = result.splice(sourceIndex, 1)
    result.splice(destinationIndex, 0, removed)

    // Update positions
    return result.map((item, index) => ({
      ...item,
      position: index
    }))
  }

  static moveBetweenArrays<T extends DragItem>(
    sourceItems: T[],
    destinationItems: T[],
    sourceIndex: number,
    destinationIndex: number,
    sourceId: string,
    destinationId: string
  ): { sourceItems: T[]; destinationItems: T[] } {
    const sourceResult = Array.from(sourceItems)
    const destinationResult = Array.from(destinationItems)

    // Remove from source
    const [movedItem] = sourceResult.splice(sourceIndex, 1)

    // Add to destination
    destinationResult.splice(destinationIndex, 0, {
      ...movedItem,
      // Update any fields that change when moving between containers
      [sourceId]: destinationId
    })

    // Update positions in both arrays
    const updatedSource = sourceResult.map((item, index) => ({
      ...item,
      position: index
    }))

    const updatedDestination = destinationResult.map((item, index) => ({
      ...item,
      position: index
    }))

    return {
      sourceItems: updatedSource,
      destinationItems: updatedDestination
    }
  }

  static resolveConflicts(
    operations: Array<{
      id: string
      sourceIndex: number
      destinationIndex: number
      timestamp: number
    }>
  ): Array<{
    id: string
    finalIndex: number
  }> {
    // Sort by timestamp to process in order
    const sortedOps = operations.sort((a, b) => a.timestamp - b.timestamp)
    const finalPositions = new Map<string, number>()

    // Process each operation
    for (const op of sortedOps) {
      const currentPositions = Array.from(finalPositions.values()).sort((a, b) => a - b)
      
      // Find the best available position
      let targetIndex = op.destinationIndex
      
      // Check for conflicts
      while (currentPositions.includes(targetIndex)) {
        targetIndex++
      }

      finalPositions.set(op.id, targetIndex)
    }

    return Array.from(finalPositions.entries()).map(([id, finalIndex]) => ({
      id,
      finalIndex
    }))
  }

  static generateGhostStyle(
    element: HTMLElement,
    dragOffset: { x: number; y: number }
  ): React.CSSProperties {
    const rect = element.getBoundingClientRect()
    
    return {
      position: 'fixed',
      top: rect.top + dragOffset.y,
      left: rect.left + dragOffset.x,
      width: rect.width,
      height: rect.height,
      zIndex: 1000,
      pointerEvents: 'none',
      opacity: 0.8,
      transform: 'rotate(5deg)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      backgroundColor: 'white',
      border: '2px solid #3b82f6',
      borderRadius: '8px'
    }
  }

  static createDropZoneHighlight(
    element: HTMLElement,
    position: 'top' | 'bottom' | 'middle'
  ): React.CSSProperties {
    const rect = element.getBoundingClientRect()
    
    switch (position) {
      case 'top':
        return {
          position: 'absolute',
          top: -2,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: '#3b82f6',
          borderRadius: 2,
          zIndex: 10
        }
      case 'bottom':
        return {
          position: 'absolute',
          bottom: -2,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: '#3b82f6',
          borderRadius: 2,
          zIndex: 10
        }
      case 'middle':
        return {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '2px dashed #3b82f6',
          borderRadius: 8,
          zIndex: 10
        }
      default:
        return {}
    }
  }

  static supportsTouch(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  static addHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }

  static getDragHandle(element: HTMLElement): HTMLElement | null {
    // Look for common drag handle selectors
    const selectors = [
      '[data-drag-handle]',
      '.drag-handle',
      '[draggable="true"]',
      'button[aria-label*="drag"]',
      'button[aria-label*="move"]'
    ]

    for (const selector of selectors) {
      const handle = element.querySelector(selector) as HTMLElement
      if (handle) return handle
    }

    return null
  }

  static createDragPreview(
    element: HTMLElement,
    options: {
      width?: number
      height?: number
      opacity?: number
      scale?: number
    } = {}
  ): HTMLElement {
    const {
      width = element.offsetWidth,
      height = element.offsetHeight,
      opacity = 0.8,
      scale = 1.05
    } = options

    const preview = element.cloneNode(true) as HTMLElement
    
    // Style the preview
    preview.style.position = 'fixed'
    preview.style.top = '-1000px'
    preview.style.left = '-1000px'
    preview.style.width = `${width}px`
    preview.style.height = `${height}px`
    preview.style.opacity = opacity.toString()
    preview.style.transform = `scale(${scale})`
    preview.style.pointerEvents = 'none'
    preview.style.zIndex = '1000'
    preview.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)'
    preview.style.borderRadius = '8px'
    preview.style.overflow = 'hidden'

    // Remove interactive elements
    const interactiveElements = preview.querySelectorAll('button, input, select, textarea, a')
    interactiveElements.forEach(el => {
      el.setAttribute('disabled', 'true')
      ;(el as HTMLElement).style.pointerEvents = 'none'
    })

    return preview
  }

  static cleanupDragPreview(preview: HTMLElement): void {
    if (preview && preview.parentNode) {
      preview.parentNode.removeChild(preview)
    }
  }

  static debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null
    
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  static throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }
}
