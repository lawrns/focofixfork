/**
 * Foco Design System Tokens - Professional SaaS Homepage
 * Inspired by Loom, Linear, Vercel - premium, authoritative, trustworthy
 */

export const designTokens = {
  // Color Palette - Exclusive and Premium
  colors: {
    background: '#FFFFFF',
    neutral_background: '#F8F9FA',
    dark_background: '#0A0A0A',
    text_primary: '#0A0A0A',
    text_secondary: '#404040',
    text_muted: '#6B6B6B',
    accent_premium: '#0052CC',
    accent_emerald: '#00B894',
    neutral_gray: '#F5F5F7',
    border: '#E5E5E5',
    subtle_border: '#F0F0F0',
    glass_bg: 'rgba(255, 255, 255, 0.9)',
    glass_border: 'rgba(0, 0, 0, 0.08)',
    premium_gradient: 'linear-gradient(135deg, #0052CC 0%, #00B894 100%)'
  },

  // Typography - Exclusive and Refined
  typography: {
    font_family: 'Inter, sans-serif',
    heading_font: 'Inter Display',
    hero: {
      size: 'clamp(3.5rem, 8vw, 6rem)',
      weight: 800,
      line_height: '105%',
      letter_spacing: '-0.02em'
    },
    headline: {
      size: 'clamp(2.5rem, 6vw, 4rem)',
      weight: 700,
      line_height: '110%',
      letter_spacing: '-0.01em'
    },
    subheadline: {
      size: 'clamp(1.25rem, 2.5vw, 1.5rem)',
      weight: 400,
      line_height: '135%',
      max_width: '35ch'
    },
    body: {
      size: '1rem',
      weight: 400,
      line_height: '160%'
    },
    cta: {
      size: '1rem',
      weight: 600
    },
    accent: {
      size: '0.875rem',
      weight: 600,
      letter_spacing: '0.1em',
      text_transform: 'uppercase'
    }
  },

  // Spacing Scale
  spacing: {
    0: '0px',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
    40: '10rem',    // 160px
    48: '12rem',    // 192px
    56: '14rem',    // 224px
    64: '16rem'     // 256px
  },

  // Border Radius - Modern and dynamic
  radius: {
    button: '999px',
    card: '20px',
    video: '24px',
    glass: '16px'
  },

  // Shadows - Exclusive and subtle
  shadows: {
    navbar: '0 1px 2px rgba(0,0,0,0.05)',
    card: '0 1px 3px rgba(0,0,0,0.08)',
    card_hover: '0 2px 8px rgba(0,0,0,0.12)',
    glass: '0 2px 16px rgba(0,0,0,0.04)',
    subtle_glow: '0 0 0 1px rgba(0, 82, 204, 0.08)',
    floating: '0 4px 16px rgba(0,0,0,0.08)',
    premium: '0 8px 32px rgba(0,0,0,0.08)'
  },

  // Animations - Exclusive and cinematic
  animations: {
    duration: {
      fast: '200ms',
      normal: '400ms',
      slow: '800ms'
    },
    easing: {
      smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      subtle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      exclusive: 'cubic-bezier(0.16, 1, 0.3, 1)'
    }
  },

  // Transitions
  transitions: {
    DEFAULT: 'color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, text-decoration-color 0.15s ease-in-out, fill 0.15s ease-in-out, stroke 0.15s ease-in-out, opacity 0.15s ease-in-out, box-shadow 0.15s ease-in-out, transform 0.15s ease-in-out, filter 0.15s ease-in-out, backdrop-filter 0.15s ease-in-out',
    none: 'none',
    all: 'all 0.15s ease-in-out',
    colors: 'color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, text-decoration-color 0.15s ease-in-out, fill 0.15s ease-in-out, stroke 0.15s ease-in-out',
    opacity: 'opacity 0.15s ease-in-out',
    shadow: 'box-shadow 0.15s ease-in-out',
    transform: 'transform 0.15s ease-in-out'
  },

  // Z-Index Scale
  zIndex: {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto'
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  // Grid
  grid: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      7: 'grid-cols-7',
      8: 'grid-cols-8',
      9: 'grid-cols-9',
      10: 'grid-cols-10',
      11: 'grid-cols-11',
      12: 'grid-cols-12',
      none: 'grid-cols-none'
    }
  }
} as const

export type DesignTokens = typeof designTokens

// Helper functions for theme-aware values
export const getColorValue = (color: keyof typeof designTokens.colors, shade: string = '500') => {
  const colorObj = designTokens.colors[color]
  if (typeof colorObj === 'object' && colorObj !== null) {
    return (colorObj as Record<string, string>)[shade]
  }
  return colorObj
}

export const getSpacingValue = (size: keyof typeof designTokens.spacing) => {
  return designTokens.spacing[size]
}

export const getBorderRadiusValue = (size: keyof typeof designTokens.radius) => {
  return designTokens.radius[size as keyof typeof designTokens.radius]
}

export const getShadowValue = (size: keyof typeof designTokens.shadows) => {
  return designTokens.shadows[size]
}


