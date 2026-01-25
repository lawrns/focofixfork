// Type augmentation for Framer Motion to allow string literals for ease and type
import 'framer-motion'

declare module 'framer-motion' {
  interface ValueAnimationTransition<V = any> {
    ease?: string | Easing | Easing[]
    type?: string
  }
}
