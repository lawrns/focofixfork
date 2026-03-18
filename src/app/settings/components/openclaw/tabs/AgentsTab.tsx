'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentsConfig } from '@/lib/openclaw/types';

interface AgentsTabProps {
  config: AgentsConfig;
  onChange: (config: AgentsConfig) => void;
}

export function AgentsTab({ config, onChange }: AgentsTabProps) {
  const updateField = <K extends keyof AgentsConfig>(
    field: K,
    value: AgentsConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const addStylePreference = (pref: string) => {
    if (pref.trim()) {
      onChange({
        ...config,
        codeStandards: {
          ...config.codeStandards,
          stylePreferences: [...config.codeStandards.stylePreferences, pref.trim()],
        },
      });
    }
  };

  const removeStylePreference = (index: number) => {
    onChange({
      ...config,
      codeStandards: {
        ...config.codeStandards,
        stylePreferences: config.codeStandards.stylePreferences.filter((_, i) => i !== index),
      },
    });
  };

  const addProhibitedOp = (op: string) => {
    if (op.trim()) {
      onChange({
        ...config,
        prohibitedOperations: [...config.prohibitedOperations, op.trim()],
      });
    }
  };

  const removeProhibitedOp = (index: number) => {
    onChange({
      ...config,
      prohibitedOperations: config.prohibitedOperations.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Role Card */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Role</CardTitle>
          <CardDescription>
            Define your agent&apos;s primary purpose and responsibilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-role">Role Description</Label>
            <Textarea
              id="agent-role"
              value={config.role}
              onChange={(e) => updateField('role', e.target.value)}
              placeholder="e.g., Full-stack development partner specializing in Node.js, React, and system architecture."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              A clear description helps the agent understand its purpose
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Code Standards Card */}
      <Card>
        <CardHeader>
          <CardTitle>Code Standards</CardTitle>
          <CardDescription>
            Preferences for code quality, testing, and documentation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="code-language">Primary Language</Label>
              <Input
                id="code-language"
                value={config.codeStandards.language}
                onChange={(e) =>
                  onChange({
                    ...config,
                    codeStandards: { ...config.codeStandards, language: e.target.value },
                  })
                }
                placeholder="TypeScript"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testing-policy">Testing Policy</Label>
              <Select
                value={config.codeStandards.testingPolicy}
                onValueChange={(value) =>
                  onChange({
                    ...config,
                    codeStandards: {
                      ...config.codeStandards,
                      testingPolicy: value as AgentsConfig['codeStandards']['testingPolicy'],
                    },
                  })
                }
              >
                <SelectTrigger id="testing-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tdd">Test-Driven Development</SelectItem>
                  <SelectItem value="after">Write tests after</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="required">Always required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-policy">Documentation</Label>
              <Select
                value={config.codeStandards.documentationPolicy}
                onValueChange={(value) =>
                  onChange({
                    ...config,
                    codeStandards: {
                      ...config.codeStandards,
                      documentationPolicy: value as AgentsConfig['codeStandards']['documentationPolicy'],
                    },
                  })
                }
              >
                <SelectTrigger id="doc-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline comments</SelectItem>
                  <SelectItem value="separate">Separate docs</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Style Preferences</Label>
            <div className="flex flex-wrap gap-2">
              {config.codeStandards.stylePreferences.map((pref, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1.5">
                  {pref}
                  <button
                    onClick={() => removeStylePreference(index)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('new-pref') as HTMLInputElement;
                addStylePreference(input.value);
                input.value = '';
              }}
              className="flex gap-2"
            >
              <Input
                name="new-pref"
                placeholder="Add style preference (e.g., 'Functional components')"
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Decision Framework Card */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Framework</CardTitle>
          <CardDescription>
            How your agent approaches different types of problems.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="decision-performance">Performance Issues</Label>
            <Input
              id="decision-performance"
              value={config.decisionFramework.performanceBottleneck}
              onChange={(e) =>
                onChange({
                  ...config,
                  decisionFramework: {
                    ...config.decisionFramework,
                    performanceBottleneck: e.target.value,
                  },
                })
              }
              placeholder="e.g., Profile first, optimize second"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision-feature">New Features</Label>
            <Input
              id="decision-feature"
              value={config.decisionFramework.newFeature}
              onChange={(e) =>
                onChange({
                  ...config,
                  decisionFramework: {
                    ...config.decisionFramework,
                    newFeature: e.target.value,
                  },
                })
              }
              placeholder="e.g., Start with tests, then implement"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision-bug">Bug Fixes</Label>
            <Input
              id="decision-bug"
              value={config.decisionFramework.bugFix}
              onChange={(e) =>
                onChange({
                  ...config,
                  decisionFramework: {
                    ...config.decisionFramework,
                    bugFix: e.target.value,
                  },
                })
              }
              placeholder="e.g., Write failing test first, then fix"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision-debt">Technical Debt</Label>
            <Input
              id="decision-debt"
              value={config.decisionFramework.technicalDebt}
              onChange={(e) =>
                onChange({
                  ...config,
                  decisionFramework: {
                    ...config.decisionFramework,
                    technicalDebt: e.target.value,
                  },
                })
              }
              placeholder="e.g., Document and schedule cleanup"
            />
          </div>
        </CardContent>
      </Card>

      {/* Response Guidelines Card */}
      <Card>
        <CardHeader>
          <CardTitle>Response Guidelines</CardTitle>
          <CardDescription>
            Control the length and content of agent responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Max Response Length</Label>
              <span className="text-sm text-muted-foreground">
                {config.responseGuidelines.maxLength} words
              </span>
            </div>
            <Slider
              value={[config.responseGuidelines.maxLength]}
              onValueChange={([value]) =>
                onChange({
                  ...config,
                  responseGuidelines: {
                    ...config.responseGuidelines,
                    maxLength: value,
                  },
                })
              }
              min={50}
              max={1000}
              step={50}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Concise (50)</span>
              <span>Detailed (1000)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="flex items-center justify-between space-y-0">
              <Label htmlFor="require-code">Require Code Examples</Label>
              <Switch
                id="require-code"
                checked={config.responseGuidelines.requireCodeExamples}
                onCheckedChange={(checked) =>
                  onChange({
                    ...config,
                    responseGuidelines: {
                      ...config.responseGuidelines,
                      requireCodeExamples: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between space-y-0">
              <Label htmlFor="include-tradeoffs">Include Trade-offs</Label>
              <Switch
                id="include-tradeoffs"
                checked={config.responseGuidelines.includeTradeoffs}
                onCheckedChange={(checked) =>
                  onChange({
                    ...config,
                    responseGuidelines: {
                      ...config.responseGuidelines,
                      includeTradeoffs: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between space-y-0">
              <Label htmlFor="error-handling">Require Error Handling</Label>
              <Switch
                id="error-handling"
                checked={config.responseGuidelines.errorHandlingRequired}
                onCheckedChange={(checked) =>
                  onChange({
                    ...config,
                    responseGuidelines: {
                      ...config.responseGuidelines,
                      errorHandlingRequired: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between space-y-0">
              <Label htmlFor="ask-clarifying">Ask Clarifying Questions</Label>
              <Switch
                id="ask-clarifying"
                checked={config.responseGuidelines.askClarifyingQuestions}
                onCheckedChange={(checked) =>
                  onChange({
                    ...config,
                    responseGuidelines: {
                      ...config.responseGuidelines,
                      askClarifyingQuestions: checked,
                    },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prohibited Operations Card */}
      <Card>
        <CardHeader>
          <CardTitle>Prohibited Operations</CardTitle>
          <CardDescription>
            Actions that require explicit user confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {config.prohibitedOperations.map((op, index) => (
              <Badge key={index} variant="destructive" className="px-3 py-1.5">
                {op}
                <button
                  onClick={() => removeProhibitedOp(index)}
                  className="ml-2 hover:text-white/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('new-op') as HTMLInputElement;
              addProhibitedOp(input.value);
              input.value = '';
            }}
            className="flex gap-2"
          >
            <Input
              name="new-op"
              placeholder="Add prohibited operation (e.g., 'rm -rf without confirmation')"
              className="flex-1"
            />
            <Button type="submit" size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
