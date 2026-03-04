'use client';

import { cn } from '@/lib/utils';
import { Check, Moon, Sun, Monitor, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/components/providers/theme-provider';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';
import type { DensitySetting } from '@/types/foco';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useUIPreferencesStore();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'oled', label: 'OLED', icon: Smartphone, description: 'Pure black for AMOLED displays' },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const themePreviewClass: Record<string, string> = {
    light: 'bg-[#F8F9FB] border-[#E3E6ED] text-[#0E1014]',
    dark: 'bg-[#09090F] border-[#1C1F28] text-[#E0E3EC]',
    oled: 'bg-[#000000] border-[#262626] text-[#F2F2F2]',
    system: 'bg-gradient-to-r from-[#F8F9FB] to-[#09090F] border-[#1C1F28] text-[#E0E3EC]',
  };

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
                onClick={() => setTheme(t.value as 'light' | 'dark' | 'oled' | 'system')}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-colors',
                  theme === t.value
                    ? 'border-[color:var(--foco-teal)] bg-secondary dark:bg-secondary/20 oled:bg-secondary/20'
                    : 'border-border hover:border-foreground/30'
                )}
                aria-pressed={theme === t.value}
                aria-label={`Select ${t.label} theme`}
              >
                <div className={cn('h-12 w-full rounded-md border p-2', themePreviewClass[t.value])}>
                  <div className="h-1.5 w-8 rounded bg-current/45" />
                  <div className="mt-2 h-1.5 w-12 rounded bg-current/30" />
                  <div className="mt-2 h-5 w-full rounded bg-current/20" />
                </div>
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
                    : 'border-border hover:border-foreground/30'
                )}
              >
                <div>
                  <div className="font-medium">{d.label}</div>
                  <div className="text-sm text-muted-foreground">{d.description}</div>
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
