/**
 * Animation Specifications
 * Framer Motion variants for consistent animations across the app
 */

export const animations = {
  // Button animations
  button: {
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
    transition: { duration: 0.15, ease: "easeOut" },
  },

  // Card hover animations
  card: {
    hover: {
      y: -4,
      boxShadow:
        "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    },
    tap: { scale: 0.99 },
    transition: { duration: 0.2, ease: "easeOut" },
  },

  // Fade in up (for lists)
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 },
  },

  // Stagger children
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.05 } },
  },

  // Scale in (for modals, dropdowns)
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15 },
  },

  // Slide in from right (for sidebars, panels)
  slideInRight: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Slide in from left
  slideInLeft: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Dropdown appear
  dropdownAppear: {
    initial: { opacity: 0, y: -8, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.96 },
    transition: { duration: 0.15 },
  },

  // Toast slide in
  toastSlideIn: {
    initial: { opacity: 0, x: 100, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 100, scale: 0.95 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },

  // Spin (for loading)
  spin: {
    animate: { rotate: 360 },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },

  // Pulse (for notifications)
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },

  // Page transitions
  pageTransition: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },

  // Drag overlay
  dragOverlay: {
    scale: 1.05,
    rotate: 3,
    opacity: 0.9,
    boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  },

  // Drop animation
  dropAnimation: {
    duration: 0.25,
    ease: [0.25, 1, 0.5, 1],
  },
};

export default animations;
