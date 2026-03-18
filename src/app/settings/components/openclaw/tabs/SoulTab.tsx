'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { SoulConfig } from '@/lib/openclaw/types';

interface SoulTabProps {
  config: SoulConfig;
  onChange: (config: SoulConfig) => void;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'witty', label: 'Witty' },
  { value: 'direct', label: 'Direct' },
  { value: 'supportive', label: 'Supportive' },
] as const;

const VERBOSITY_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
] as const;

const FORMALITY_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'informal', label: 'Informal' },
] as const;

export function SoulTab({ config, onChange }: SoulTabProps) {
  const updateField = <K extends keyof SoulConfig>(
    field: K,
    value: SoulConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const updateCommunicationStyle = <K extends keyof SoulConfig['communicationStyle']>(
    field: K,
    value: SoulConfig['communicationStyle'][K]
  ) => {
    onChange({
      ...config,
      communicationStyle: { ...config.communicationStyle, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Communication Style</CardTitle>
          <CardDescription>
            Define how your agent communicates with you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={config.communicationStyle.tone}
                onValueChange={(value) => updateCommunicationStyle('tone', value as SoulConfig['communicationStyle']['tone'])}
              >
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verbosity">Verbosity</Label>
              <Select
                value={config.communicationStyle.verbosity}
                onValueChange={(value) => updateCommunicationStyle('verbosity', value as SoulConfig['communicationStyle']['verbosity'])}
              >
                <SelectTrigger id="verbosity">
                  <SelectValue placeholder="Select verbosity" />
                </SelectTrigger>
                <SelectContent>
                  {VERBOSITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formality">Formality</Label>
              <Select
                value={config.communicationStyle.formality}
                onValueChange={(value) => updateCommunicationStyle('formality', value as SoulConfig['communicationStyle']['formality'])}
              >
                <SelectTrigger id="formality">
                  <SelectValue placeholder="Select formality" />
                </SelectTrigger>
                <SelectContent>
                  {FORMALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <Label htmlFor="humor">Humor Level</Label>
              <span className="text-sm text-muted-foreground">{config.communicationStyle.humorLevel}/10</span>
            </div>
            <Slider
              value={[config.communicationStyle.humorLevel]}
              onValueChange={([value]) => updateCommunicationStyle('humorLevel', value)}
              min={0}
              max={10}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Core Values</CardTitle>
          <CardDescription>
            Principles that guide your agent&apos;s behavior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.values.join('\n')}
            onChange={(e) => updateField('values', e.target.value.split('\n').filter(Boolean))}
            placeholder="Enter one value per line..."
            rows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Core Truths</CardTitle>
          <CardDescription>
            Fundamental truths that define your agent&apos;s worldview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.coreTruths.join('\n')}
            onChange={(e) => updateField('coreTruths', e.target.value.split('\n').filter(Boolean))}
            placeholder="Enter one truth per line..."
            rows={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
