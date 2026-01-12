'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { name: 'Red', value: '#FF6B6B' },
  { name: 'Orange', value: '#FF922B' },
  { name: 'Yellow', value: '#FDD835' },
  { name: 'Green', value: '#51CF66' },
  { name: 'Blue', value: '#339AF0' },
  { name: 'Indigo', value: '#748FFC' },
  { name: 'Purple', value: '#DA77F2' },
  { name: 'Pink', value: '#F06595' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);
  const [showCustomInput, setShowCustomInput] = useState(
    !PRESET_COLORS.some(c => c.value === value)
  );

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);

    // Validate hex format
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      onChange(color.toUpperCase());
    }
  };

  const handlePresetSelect = (color: string) => {
    setCustomColor(color);
    setShowCustomInput(false);
    onChange(color);
  };

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-medium">{label}</label>}

      {/* Preset Colors */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(color => (
          <button
            key={color.value}
            onClick={() => handlePresetSelect(color.value)}
            className={cn(
              'relative w-10 h-10 rounded-lg border-2 transition-all',
              value === color.value
                ? 'border-black dark:border-white'
                : 'border-gray-300 dark:border-gray-600'
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
            aria-label={`Select ${color.name} color`}
          >
            {value === color.value && (
              <Check className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow" />
            )}
          </button>
        ))}
      </div>

      {/* Custom Color Input */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={customColor}
          onChange={e => {
            const color = e.target.value.toUpperCase();
            setCustomColor(color);
            setShowCustomInput(true);
            onChange(color);
          }}
          className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          aria-label="Custom color picker"
        />

        <input
          type="text"
          value={customColor}
          onChange={handleCustomColorChange}
          placeholder="#000000"
          className={cn(
            'flex-1 px-3 py-2 rounded border text-sm font-mono',
            /^#[0-9A-Fa-f]{6}$/.test(customColor)
              ? 'border-green-500'
              : 'border-red-500'
          )}
          maxLength={7}
          aria-label="Enter hex color code"
        />
      </div>

      {/* Color Preview */}
      <div
        className="w-full h-10 rounded border-2 border-gray-200 dark:border-gray-700"
        style={{ backgroundColor: customColor }}
        aria-label={`Color preview: ${customColor}`}
      />

      {/* Help Text */}
      {!/^#[0-9A-Fa-f]{6}$/.test(customColor) && (
        <p className="text-xs text-red-500">
          Please enter a valid hex color (#RRGGBB)
        </p>
      )}
    </div>
  );
}
