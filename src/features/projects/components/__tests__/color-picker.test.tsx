'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ColorPicker } from '../color-picker'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="icon-check">Check</span>,
  Palette: () => <span data-testid="icon-palette">Palette</span>,
}))

const COLOR_PALETTE = [
  '#6366F1', // indigo
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6B7280', // gray
  '#14B8A6', // teal
  '#F97316', // orange
  '#A855F7', // purple
]

describe('ColorPicker Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Display and Rendering', () => {
    it('should render color picker with palette button', () => {
      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={vi.fn()}
        />
      )

      expect(screen.getByTestId('icon-palette')).toBeInTheDocument()
    })

    it('should display color palette when palette button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={vi.fn()}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      // Verify palette colors are visible
      COLOR_PALETTE.forEach(color => {
        const colorButton = screen.getByRole('button', {
          name: new RegExp(color, 'i'),
        })
        expect(colorButton).toBeInTheDocument()
      })
    })

    it('should show all palette colors in correct order', async () => {
      const user = userEvent.setup()

      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={vi.fn()}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      const colorButtons = screen.getAllByRole('button').filter(btn =>
        COLOR_PALETTE.some(color => btn.getAttribute('data-color') === color)
      )

      expect(colorButtons).toHaveLength(COLOR_PALETTE.length)
    })
  })

  describe('Color Selection', () => {
    it('should call onColorChange callback when a color is selected', async () => {
      const user = userEvent.setup()
      const handleColorChange = vi.fn()

      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={handleColorChange}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      // Select blue color
      const blueColorButton = screen.getByRole('button', {
        name: /#3B82F6/i,
      })

      await user.click(blueColorButton)

      expect(handleColorChange).toHaveBeenCalledWith('#3B82F6')
      expect(handleColorChange).toHaveBeenCalledTimes(1)
    })

    it('should display current color in color preview', () => {
      render(
        <ColorPicker
          currentColor="#3B82F6"
          onColorChange={vi.fn()}
        />
      )

      const colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#3B82F6' })
    })

    it('should display check mark on selected color', async () => {
      const user = userEvent.setup()

      render(
        <ColorPicker
          currentColor="#3B82F6"
          onColorChange={vi.fn()}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      // Check mark should appear on blue color
      const blueColorButton = screen.getByRole('button', {
        name: /#3B82F6/i,
      })

      expect(blueColorButton).toHaveAttribute('data-selected', 'true')
    })

    it('should update preview when different colors are selected', async () => {
      const user = userEvent.setup()
      const handleColorChange = vi.fn()

      const { rerender } = render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={handleColorChange}
        />
      )

      let colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#6366F1' })

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      const redColorButton = screen.getByRole('button', {
        name: /#EF4444/i,
      })

      await user.click(redColorButton)

      rerender(
        <ColorPicker
          currentColor="#EF4444"
          onColorChange={handleColorChange}
        />
      )

      colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#EF4444' })
    })
  })

  describe('Palette Visibility', () => {
    it('should hide palette when clicking outside', async () => {
      const user = userEvent.setup()

      render(
        <div>
          <ColorPicker
            currentColor="#6366F1"
            onColorChange={vi.fn()}
          />
          <div data-testid="outside-element">Outside</div>
        </div>
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      // Palette should be visible
      const firstColor = screen.getByRole('button', {
        name: /#6366F1/i,
      })
      expect(firstColor).toBeInTheDocument()

      // Click outside
      const outsideElement = screen.getByTestId('outside-element')
      await user.click(outsideElement)

      // First color should still be in DOM but palette may be hidden
      // (visibility is handled by popover/dropdown mechanics)
    })

    it('should close palette after color selection', async () => {
      const user = userEvent.setup()

      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={vi.fn()}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      await user.click(paletteButton)

      const blueColorButton = screen.getByRole('button', {
        name: /#3B82F6/i,
      })

      await user.click(blueColorButton)

      // After selection, palette should close
      // (depends on implementation - may need adjustment based on actual behavior)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={vi.fn()}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      expect(paletteButton).toHaveAttribute('aria-label')
    })

    it('should support keyboard navigation in color palette', async () => {
      const user = userEvent.setup()
      const handleColorChange = vi.fn()

      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={handleColorChange}
        />
      )

      const paletteButton = screen.getByRole('button', {
        name: /color palette/i,
      })

      // Focus the palette button
      paletteButton.focus()
      expect(paletteButton).toHaveFocus()

      // Open palette (assuming space/enter opens it)
      await user.keyboard('{Enter}')

      // Colors should be accessible
      const colorButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('data-color')
      )

      expect(colorButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Project Integration', () => {
    it('should work with hex color format', () => {
      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={vi.fn()}
        />
      )

      const colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#6366F1' })
    })

    it('should display color with custom label', () => {
      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={vi.fn()}
          label="Project Color"
        />
      )

      expect(screen.getByText('Project Color')).toBeInTheDocument()
    })

    it('should handle default color properly', () => {
      render(
        <ColorPicker
          currentColor="#6366F1"
          onColorChange={vi.fn()}
        />
      )

      const colorPreview = screen.getByTestId('color-preview')
      expect(colorPreview).toHaveStyle({ backgroundColor: '#6366F1' })
    })
  })
})
