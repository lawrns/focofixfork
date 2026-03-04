'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Moon, Sun, Monitor, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import type { DensitySetting } from '@/types/foco';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'oled', label: 'OLED', icon: Smartphone, description: 'Pure black for AMOLED displays' },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const densities: { value: DensitySetting; label: string; description: string }[] = [
    { value: 'compact', label: 'Compact', description: 'More information, less whitespace' },
    { value: 'comfortable', label: 'Comfortable', description: 'Balanced layout (recommended)' },
    { value: 'spacious', label: 'Spacious', description: 'More whitespace, easier scanning' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  theme === t.value
                    ? 'border-[color:var(--foco-teal)] bg-secondary dark:bg-secondary/20 oled:bg-secondary/20'
                    : 'border-zinc-200 dark:border-zinc-800 oled:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 oled:hover:border-zinc-700'
                )}
                aria-pressed={theme === t.value}
                aria-label={`Select ${t.label} theme`}
              >
                <t.icon className="h-6 w-6" />
                <span className="text-sm font-medium">{t.label}</span>
                {'description' in t && (
                  <span className="text-xs text-muted-foreground text-center leading-tight">{t.description}</span>
                )}
                {theme === t.value && (
                  <Check className="h-4 w-4 text-[color:var(--foco-teal)]" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Density</CardTitle>
          <CardDescription>
            Adjust the spacing and information density
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {densities.map((d) => (
              <button
                key={d.value}
                onClick={() => setDensity(d.value)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left',
                  density === d.value
                    ? 'border-[color:var(--foco-teal)] bg-secondary dark:bg-secondary/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div>
                  <div className="font-medium">{d.label}</div>
                  <div className="text-sm text-zinc-500">{d.description}</div>
                </div>
                {density === d.value && (
                  <Check className="h-5 w-5 text-[color:var(--foco-teal)]" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
