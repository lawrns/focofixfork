'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Plus, 
  Trash2,
  Loader2,
  ChevronDown,
  Settings,
  Globe,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSurfaceStore } from '../stores/surface-store';
import { SurfaceExecutionLog } from './surface-execution-log';
import { SurfaceCapabilityBadge } from './surface-capability-badge';
import type { SurfaceType, SurfaceAction } from '../types';

const SURFACE_TYPES: SurfaceType[] = ['browser', 'api', 'file_system', 'communication', 'calendar'];

const SAMPLE_ACTIONS: Record<SurfaceType, Partial<SurfaceAction>> = {
  browser: { type: 'navigate', url: 'https://example.com' },
  api: { type: 'http', method: 'GET', url: 'https://api.example.com/status' },
  file_system: { type: 'read', path: '/tmp/example.txt' },
  communication: { type: 'slack', to: '#general', message: 'Hello from agent' },
  calendar: { type: 'create_event', title: 'Team Standup', start_time: new Date().toISOString() },
};

interface AgentSurfaceControllerProps {
  agentId?: string;
  className?: string;
}

export function AgentSurfaceController({ agentId: propAgentId, className }: AgentSurfaceControllerProps) {
  const {
    surfaces,
    executions,
    selectedAgentId: storeAgentId,
    setSelectedAgent,
    fetchSurfaces,
    fetchExecutions,
  } = useSurfaceStore();

  // Use prop agentId if provided, otherwise use store
  const selectedAgentId = propAgentId || storeAgentId;

  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);
  const [actionInput, setActionInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleRegister = async (type: SurfaceType) => {
    if (!selectedAgentId) {
      toast.error('Select an agent first');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch('/api/agent-surfaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          agentBackend: 'clawdbot',
          surfaceType: type,
          capabilities: [type],
          config: {},
        }),
      });

      if (!res.ok) throw new Error('Failed to register');
      
      toast.success(`${type} surface registered`);
      fetchSurfaces(selectedAgentId);
    } catch (error) {
      toast.error('Failed to register surface');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedAgentId || !actionInput.trim()) return;

    setIsExecuting(true);
    try {
      const action = JSON.parse(actionInput);
      
      const res = await fetch('/api/agent-surfaces/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          action,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success('Action executed');
      } else {
        toast.error(data.error || 'Execution failed');
      }
      
      fetchExecutions(selectedAgentId);
    } catch (error) {
      toast.error('Invalid action JSON');
    } finally {
      setIsExecuting(false);
    }
  };

  const agentSurfaces = surfaces.filter(s => s.agent_id === selectedAgentId);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Agent Surface Controller
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Selector */}
        <div className="space-y-2">
          <Label className="text-xs">Select Agent</Label>
          <Input
            placeholder="agent-id (e.g., clawdbot::agent-1)"
            value={selectedAgentId || ''}
            onChange={(e) => setSelectedAgent(e.target.value || null)}
            className="text-sm font-mono"
          />
        </div>

        {/* Registered Surfaces */}
        {selectedAgentId && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Registered Surfaces</Label>
              <div className="flex flex-wrap gap-2">
                {agentSurfaces.map((surface) => (
                  <SurfaceCapabilityBadge
                    key={surface.id}
                    type={surface.surface_type}
                    capabilities={surface.capabilities}
                    status={surface.status}
                  />
                ))}
                
                {/* Add Surface Dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={isRegistering}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Register New Surface */}
            <div className="space-y-2">
              <Label className="text-xs">Register New Surface</Label>
              <div className="grid grid-cols-5 gap-2">
                {SURFACE_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegister(type)}
                    disabled={isRegistering}
                    className="text-xs h-auto py-2"
                  >
                    {isRegistering ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <SurfaceCapabilityBadge type={type} />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Execute Action */}
            <div className="space-y-2">
              <Label className="text-xs">Execute Action</Label>
              <Textarea
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder={`{ "type": "navigate", "url": "https://example.com" }`}
                className="min-h-[100px] font-mono text-xs"
              />
              <Button
                onClick={handleExecute}
                disabled={isExecuting || !actionInput.trim()}
                className="w-full"
                size="sm"
              >
                {isExecuting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Execute
              </Button>
            </div>

            {/* Execution Log */}
            <SurfaceExecutionLog 
              executions={executions.filter(e => e.agent_id === selectedAgentId)} 
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
