'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useOpenClawRuntime } from '@/lib/hooks/use-openclaw-runtime'

export function AIModelPreferencesCard() {
  const { data, loading, refresh } = useOpenClawRuntime()
  const primaryLabel = data?.modelAlias ?? data?.primaryModel ?? 'Not configured'
  const configuredModels = data?.configuredModels ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI model preferences</CardTitle>
        <CardDescription>
          OpenClaw is the source of truth for model routing. Change the active model in OpenClaw, then refresh this card.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2">
            <Label>Primary model</Label>
            <div className="rounded-md border px-3 py-2 text-sm">
              {loading ? 'Loading OpenClaw runtime…' : primaryLabel}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Runtime source</Label>
            <div className="rounded-md border px-3 py-2 text-sm">
              <div>{data?.tokenSource === 'env' ? 'OpenClaw env token' : data?.tokenSource === 'config' ? 'OpenClaw config token' : 'Not configured'}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {loading
                  ? 'Checking OpenClaw runtime...'
                  : data?.relayReachable
                    ? `Relay reachable at ${data.relayUrl}`
                    : `Relay unavailable at ${data?.relayUrl ?? 'unknown relay'}`}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Gateway</Label>
            <div className="rounded-md border px-3 py-2 text-sm">{data?.gatewayUrl ?? 'Unknown'}</div>
          </div>
          <div className="space-y-2">
            <Label>Workspace</Label>
            <div className="rounded-md border px-3 py-2 text-sm">{data?.workspacePath ?? 'Unknown'}</div>
          </div>
          <div className="space-y-2">
            <Label>Config path</Label>
            <div className="rounded-md border px-3 py-2 text-sm">{data?.configPath ?? 'Unknown'}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={data?.gatewayHealthy ? 'default' : 'destructive'}>
            Primary · {primaryLabel}
          </Badge>
          <Badge variant={data?.tokenConfigured ? 'outline' : 'destructive'}>
            Auth · {data?.tokenConfigured ? 'Configured' : 'Missing'}
          </Badge>
          <Badge variant={data?.defaultModelConfigured ? 'outline' : 'destructive'}>
            Default model · {data?.defaultModelConfigured ? 'Configured in OpenClaw' : 'Missing from OpenClaw config'}
          </Badge>
          <Badge variant="outline">
            Tabs · {data?.attachedTabs ?? 0}
          </Badge>
        </div>

        <div className="space-y-2">
          <Label>Configured models</Label>
          <div className="rounded-md border px-3 py-2 text-sm">
            {loading
              ? 'Loading configured models…'
              : configuredModels.length > 0
                ? configuredModels.join(', ')
                : 'No models configured in OpenClaw'}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => void refresh()}>
            Refresh from OpenClaw
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
