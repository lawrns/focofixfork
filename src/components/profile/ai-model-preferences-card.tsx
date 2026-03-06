'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MODEL_CATALOG } from '@/lib/ai/model-catalog'
import { getModelRuntimeSourceLabel } from '@/lib/ai/model-catalog'
import { useAIHealth } from '@/lib/hooks/use-ai-health'
import { useUserModelPreferences } from '@/lib/stores/user-model-preferences'

const GENERAL_MODELS = MODEL_CATALOG.filter((entry) => !entry.pipelineOnly)
const PIPELINE_MODELS = MODEL_CATALOG

export function AIModelPreferencesCard() {
  const { getModelHealth, loading: healthLoading } = useAIHealth()
  const {
    defaultModel,
    fallbackChain,
    plannerModel,
    executorModel,
    reviewerModel,
    setDefaultModel,
    setFallbackAt,
    setPlannerModel,
    setExecutorModel,
    setReviewerModel,
    reset,
  } = useUserModelPreferences()

  const defaultModelHealth = getModelHealth(defaultModel)

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI model preferences</CardTitle>
        <CardDescription>
          Personal defaults override workspace routing at request time. GPT-5.4 Medium is the recommended baseline, and you can still pin plan / execute / review models when needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2">
            <Label>Default model</Label>
            <Select value={defaultModel} onValueChange={setDefaultModel}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a default model" />
              </SelectTrigger>
              <SelectContent>
                {GENERAL_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Runtime source</Label>
            <div className="rounded-md border px-3 py-2 text-sm">
              <div>{getModelRuntimeSourceLabel(defaultModel) ?? 'Inherited'}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {healthLoading
                  ? 'Checking availability...'
                  : defaultModelHealth?.available
                    ? defaultModelHealth.reason
                    : defaultModelHealth?.reason ?? 'Health unavailable'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const selected = fallbackChain[index] ?? '__none__'
            return (
              <div key={index} className="space-y-2">
                <Label>Fallback {index + 1}</Label>
                <Select value={selected} onValueChange={(value) => setFallbackAt(index, value === '__none__' ? null : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {GENERAL_MODELS.filter((model) => model.value !== defaultModel).map((model) => (
                      <SelectItem key={`${index}-${model.value}`} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Planner override</Label>
            <Select value={plannerModel ?? '__inherit__'} onValueChange={(value) => setPlannerModel(value === '__inherit__' ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Inherit default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__inherit__">Inherit default</SelectItem>
                {PIPELINE_MODELS.map((model) => (
                  <SelectItem key={`planner-${model.value}`} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Executor override</Label>
            <Select value={executorModel ?? '__inherit__'} onValueChange={(value) => setExecutorModel(value === '__inherit__' ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Inherit default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__inherit__">Inherit default</SelectItem>
                {PIPELINE_MODELS.map((model) => (
                  <SelectItem key={`executor-${model.value}`} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reviewer override</Label>
            <Select value={reviewerModel ?? '__inherit__'} onValueChange={(value) => setReviewerModel(value === '__inherit__' ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Inherit default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__inherit__">Inherit default</SelectItem>
                {PIPELINE_MODELS.map((model) => (
                  <SelectItem key={`reviewer-${model.value}`} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={defaultModelHealth?.available ? 'default' : 'destructive'}>
            Primary · {defaultModel}
          </Badge>
          {fallbackChain.map((model, index) => (
            <Badge
              key={`${model}-${index}`}
              variant={getModelHealth(model)?.available ? 'outline' : 'destructive'}
            >
              Fallback {index + 1} · {model}
            </Badge>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={reset}>
            Reset to recommended
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
