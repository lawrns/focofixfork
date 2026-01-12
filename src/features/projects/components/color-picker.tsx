'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check, Palette } from 'lucide-react'

export const COLOR_PALETTE = [
  '#6366F1', // indigo (default)
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

interface ColorPickerProps {
  currentColor?: string
  onColorChange: (color: string) => void
  label?: string
}

export function ColorPicker({
  currentColor = '#6366F1',
  onColorChange,
  label = 'Project Color',
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close palette when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleColorSelect = (color: string) => {
    onColorChange(color)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <Label>{label}</Label>

      <div className="flex items-center gap-2">
        {/* Color Preview */}
        <div
          data-testid="color-preview"
          className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-transform hover:scale-110"
          style={{ backgroundColor: currentColor }}
          onClick={() => setIsOpen(!isOpen)}
          title={currentColor}
        />

        {/* Palette Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open color palette"
          className="flex items-center gap-2"
        >
          <Palette className="h-4 w-4" />
          Color Palette
        </Button>
      </div>

      {/* Color Palette */}
      {isOpen && (
        <div className="grid grid-cols-4 gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 shadow-lg">
          {COLOR_PALETTE.map(color => (
            <button
              key={color}
              type="button"
              data-color={color}
              data-selected={currentColor === color ? 'true' : 'false'}
              onClick={() => handleColorSelect(color)}
              className="relative w-full h-10 rounded-lg border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              style={{
                backgroundColor: color,
                borderColor: currentColor === color ? '#000' : 'transparent',
              }}
              aria-label={color}
              title={color}
            >
              {currentColor === color && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white drop-shadow-lg" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
