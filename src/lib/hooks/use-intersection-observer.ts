'use client'

import { useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  root?: Element | null
  rootMargin?: string
  freezeOnceVisible?: boolean
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0%',
    freezeOnceVisible = false
  } = options

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const [node, setNode] = useState<Element | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!node) return

    observer.current = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry)
        
        if (freezeOnceVisible && entry.isIntersecting) {
          observer.current?.disconnect()
        }
      },
      {
        threshold,
        root,
        rootMargin
      }
    )

    observer.current.observe(node)

    return () => {
      observer.current?.disconnect()
    }
  }, [node, threshold, root, rootMargin, freezeOnceVisible])

  return { ref: setNode, entry, isIntersecting: entry?.isIntersecting ?? false }
}

export function useInView(options: UseIntersectionObserverOptions = {}) {
  const { ref, isIntersecting } = useIntersectionObserver(options)
  return { ref, isInView: isIntersecting }
}
