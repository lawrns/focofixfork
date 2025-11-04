import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { 
  Mic, Square, Sparkles, Wand2, Calendar, User, Clock, CheckCircle2,
  ListChecks, Layers, Link as LinkIcon, Rocket, Save, PlayCircle, PauseCircle,
  Search, Plus, ChevronRight, ClipboardList, Settings, FileText, Workflow,
  Activity, BarChart3, Brain, Volume2, Target
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Cell } from "recharts";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  assignee_hint?: string | null;
  estimate_hours?: number | null;
  depends_on?: string[];
};

type Milestone = {
  id: string;
  title: string;
  description?: string;
  start_date?: string | null;
  due_date?: string | null;
  tasks: Task[];
};

type PlanDraft = {
  schema_version: "1.0.0";
  project: {
    title: string;
    description: string;
    start_date?: string | null;
    due_date?: string | null;
  };
  milestones: Milestone[];
  risks: string[];
  assumptions: string[];
  open_questions: string[];
};

type IntentChip = {
  label: string;
  kind: "date" | "team" | "scope" | "platform" | "priority";
};

const uid = () => Math.random().toString(36).slice(2, 9);

const demoBrief =
  "We need a mobile task manager with auth, offline sync, and a dashboard. Public beta in 10 weeks. Two devs, one designer. iOS first, Android after.";

function synthesizePlanFromTranscript(t: string): PlanDraft {
  const hasAuth = /auth|login|authentication/i.test(t);
  const hasOffline = /offline|sync/i.test(t);
  const hasDashboard = /dashboard|analytics|charts/i.test(t);
  const hasAndroid = /android/i.test(t);
  const durationWeeks = /\b(\d{1,2})\s*weeks?/i.exec(t)?.[1] ?? "10";

  const tasksAuth: Task[] = [
    { id: uid(), title: "Email + Password", status: "todo", priority: "high", estimate_hours: 16 },
    { id: uid(), title: "OAuth (Apple/Google)", status: "todo", priority: "medium", estimate_hours: 20, depends_on: [] },
  ];

  const tasksOffline: Task[] = [
    { id: uid(), title: "Local store & cache strategy", status: "todo", priority: "high", estimate_hours: 12 },
    { id: uid(), title: "Sync engine (conflict rules)", status: "todo", priority: "high", estimate_hours: 24 },
    { id: uid(), title: "Background sync hooks", status: "todo", priority: "medium", estimate_hours: 10 },
  ];

  const tasksDashboard: Task[] = [
    { id: uid(), title: "Metrics model", status: "todo", priority: "medium", estimate_hours: 12 },
    { id: uid(), title: "Chart widgets", status: "todo", priority: "medium", estimate_hours: 20 },
    { id: uid(), title: "Filters & search", status: "todo", priority: "medium", estimate_hours: 10 },
  ];

  const milestones: Milestone[] = [];
  if (hasAuth) milestones.push({ id: uid(), title: "Auth & Accounts", tasks: tasksAuth });
  if (hasOffline) milestones.push({ id: uid(), title: "Offline Sync", tasks: tasksOffline });
  if (hasDashboard) milestones.push({ id: uid(), title: "Dashboard", tasks: tasksDashboard });
  milestones.push({ id: uid(), title: "QA & Beta Launch", tasks: [
    { id: uid(), title: "Test plan & cases", status: "todo", priority: "medium", estimate_hours: 14 },
    { id: uid(), title: "Beta TestFlight", status: "todo", priority: "high", estimate_hours: 8 },
    { id: uid(), title: "Feedback triage", status: "todo", priority: "medium", estimate_hours: 10 },
  ]});

  return {
    schema_version: "1.0.0",
    project: {
      title: "Mobile Task Manager Beta",
      description: "Voice-generated plan for mobile task manager with auth, offline sync, and dashboard.",
    },
    milestones,
    risks: ["Offline data consistency on iOS", hasAndroid ? "Android parity risk" : ""].filter(Boolean) as string[],
    assumptions: ["Two devs, one designer", `Target ${durationWeeks} weeks`],
    open_questions: ["Supabase Auth or custom?", "Telemetry + privacy policy"],
  };
}

function chunkTranscript(text: string): IntentChip[] {
  const chips: IntentChip[] = [];
  const week = /(\d{1,2})\s*weeks?/i.exec(text);
  if (week) chips.push({ label: `${week[1]} weeks`, kind: "date" });
  if (/two devs|2 devs/i.test(text)) chips.push({ label: "2 devs", kind: "team" });
  if (/designer/i.test(text)) chips.push({ label: "1 designer", kind: "team" });
  if (/auth/i.test(text)) chips.push({ label: "Auth", kind: "scope" });
  if (/offline/i.test(text)) chips.push({ label: "Offline sync", kind: "scope" });
  if (/dashboard/i.test(text)) chips.push({ label: "Dashboard", kind: "scope" });
  if (/ios/i.test(text)) chips.push({ label: "iOS", kind: "platform" });
  if (/android/i.test(text)) chips.push({ label: "Android", kind: "platform" });
  return chips;
}

interface SortableTaskProps {
  task: Task
  onToggle: (id: string) => void
}

function SortableTask({ task, onToggle }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const pill = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-rose-100 text-rose-700",
  }[task.priority];

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="group rounded-xl border bg-white/70 backdrop-blur p-3 flex items-center justify-between hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing select-none text-slate-400"
        >
          ⋮⋮
        </div>
        <button 
          onClick={() => onToggle(task.id)} 
          className="h-5 w-5 rounded border flex items-center justify-center"
          aria-label={task.title}
        >
          {task.status === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <span className="block h-3 w-3 rounded-full bg-slate-300" />
          )}
        </button>
        <div>
          <p className="font-medium text-slate-800 leading-5">{task.title}</p>
          {task.description && (
            <p className="text-xs text-slate-500">{task.description}</p>
          )}
          <div className="mt-1 flex gap-2 items-center">
            <Badge variant="secondary" className={`${pill} border-0`}>{task.priority}</Badge>
            {Number.isFinite(task.estimate_hours) && (
              <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {task.estimate_hours}h
              </span>
            )}
          </div>
        </div>
      </div>
      {task.assignee_hint && (
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <User className="h-3 w-3" /> {task.assignee_hint}
        </div>
      )}
    </div>
  );
}

interface AudioVisualizerProps {
  isRecording: boolean
}

function AudioVisualizer({ isRecording }: AudioVisualizerProps) {
  return (
    <div className="flex items-end gap-1 h-10">
      {new Array(32).fill(0).map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            height: isRecording ? Math.max(6, Math.random() * 40) : 6,
            backgroundColor: isRecording ? "rgb(16 185 129)" : "rgb(148 163 184)"
          }}
          transition={{ duration: 0.25 }}
          className="w-1 rounded-full"
        />
      ))}
    </div>
  );
}

interface QualityGatesProps {
  transcriptionConfidence: number
  intentExtraction: number
  planningLatency: number
}

function QualityGates({ transcriptionConfidence, intentExtraction, planningLatency }: QualityGatesProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Quality Gates
        </div>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Transcription confidence</span>
            <span className="text-muted-foreground">{transcriptionConfidence}%</span>
          </div>
          <Progress value={transcriptionConfidence} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Intent extraction</span>
            <span className="text-muted-foreground">{intentExtraction}%</span>
          </div>
          <Progress value={intentExtraction} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Planning latency (p95)</span>
            <span className="text-muted-foreground">{planningLatency}%</span>
          </div>
          <Progress value={planningLatency} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface IntentChipsProps {
  chips: IntentChip[]
}

function IntentChips({ chips }: IntentChipsProps) {
  const chipColors = {
    date: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-200 dark:border-blue-700 shadow-sm",
    team: "bg-gradient-to-r from-amber-500 to-amber-600 text-white border border-amber-200 dark:border-amber-700 shadow-sm",
    scope: "bg-gradient-to-r from-violet-500 to-violet-600 text-white border border-violet-200 dark:border-violet-700 shadow-sm",
    platform: "bg-gradient-to-r from-purple-500 to-purple-600 text-white border border-purple-200 dark:border-purple-700 shadow-sm",
    priority: "bg-gradient-to-r from-rose-500 to-rose-600 text-white border border-rose-200 dark:border-rose-700 shadow-sm",
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <Badge 
          key={i} 
          className={cn("text-xs font-medium px-3 py-1", chipColors[chip.kind])}
        >
          {chip.label}
        </Badge>
      ))}
    </div>
  )
}

interface TimelineVisualizationProps {
  draft: PlanDraft | null
}

function TimelineVisualization({ draft }: TimelineVisualizationProps) {
  const ganttData = useMemo(() => {
    if (!draft) return []
    return draft.milestones.map((milestone, idx) => ({
      name: milestone.title,
      days: (milestone.tasks.length * 2) + 5,
      idx,
      tasks: milestone.tasks.length,
    }))
  }, [draft])

  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#06b6d4', '#84cc16']

  if (!draft) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-10 text-center text-muted-foreground">
          Generate a plan to view timeline.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Project Timeline
          </div>
          <Badge variant="secondary">Duration by Milestone</Badge>
        </div>
      </CardHeader>
      <CardContent style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ganttData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <RTooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-sm text-muted-foreground">{data.days} days</p>
                      <p className="text-sm text-muted-foreground">{data.tasks} tasks</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="days" radius={[6, 6, 0, 0]}>
              {ganttData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default function VoicePlanningWorkbench() {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState(demoBrief)
  const [chips, setChips] = useState(chunkTranscript(demoBrief))
  const [draft, setDraft] = useState<PlanDraft | null>(null)
  const [activeTab, setActiveTab] = useState("voice")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  const transcriptionConfidence = 95
  const intentExtraction = 85
  const planningLatency = 75

  useEffect(() => {
    setChips(chunkTranscript(transcript))
  }, [transcript])

  const showStatus = (message: string) => {
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage(null), 4000)
  }

  const showError = (message: string) => {
    setError(message)
    window.setTimeout(() => setError(null), 4000)
  }

  const handleRecordToggle = () => {
    setRecording(prev => {
      const next = !prev
      showStatus(next ? "Recording started" : "Recording stopped")
      return next
    })
  }

  const generatePlan = async () => {
    if (!transcript.trim()) {
      showError("Please provide a transcript")
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100))
      const plan = synthesizePlanFromTranscript(transcript)
      setDraft(plan)
      setActiveTab("review")
      showStatus("Plan generated successfully")
    } catch (err) {
      showError("Failed to generate plan")
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = (mid: string, tid: string) => {
    if (!draft) return
    const next: PlanDraft = {
      ...draft,
      milestones: draft.milestones.map(m => {
        if (m.id !== mid) return m
        return {
          ...m,
          tasks: m.tasks.map(t =>
            t.id === tid ? { ...t, status: t.status === "done" ? "todo" : "done" } : t
          )
        }
      })
    }
    setDraft(next)
  }

  const onDragEnd = (event: any, mid: string) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id || !draft) return
    const next = { ...draft } as PlanDraft
    const ms = next.milestones.find(m => m.id === mid)
    if (!ms) return
    const oldIndex = ms.tasks.findIndex(t => t.id === active.id)
    const newIndex = ms.tasks.findIndex(t => t.id === over.id)
    ms.tasks = arrayMove(ms.tasks, oldIndex, newIndex)
    setDraft(next)
  }

  const saveDraft = () => {
    showStatus("Draft saved (demo)")
  }

  const commitPlan = () => {
    showStatus("Plan committed (demo)")
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
          <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 shadow-inner" />
              <div>
                <h1 className="text-base font-semibold tracking-tight">FOCO</h1>
                <p className="text-xs text-slate-500 -mt-1">Speak your roadmap. Ship your future.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2"><Search className="h-4 w-4"/>Search</Button>
              <Button variant="outline" size="sm" className="gap-2"><Settings className="h-4 w-4"/>Settings</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">New Project</Button>
            </div>
          </div>
        </header>

        {statusMessage && (
          <div className="mx-auto max-w-3xl px-6 py-3 text-sm text-emerald-900 bg-emerald-100 border border-emerald-200">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="mx-auto max-w-3xl px-6 py-3 text-sm text-red-900 bg-red-100 border border-red-200">
            {error}
          </div>
        )}

        {/* Content */}
        <main className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3 space-y-3">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="text-sm font-medium text-slate-500">Quick Nav</div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {[
                  { icon: <ClipboardList className="h-4 w-4"/>, label: "Dashboard" },
                  { icon: <Workflow className="h-4 w-4"/>, label: "Projects" },
                  { icon: <Mic className="h-4 w-4"/>, label: "Voice → Plan (Beta)" },
                  { icon: <FileText className="h-4 w-4"/>, label: "Reports" },
                ].map((item, idx) => (
                  <Button key={idx} variant={idx===2?"secondary":"ghost"} className="justify-start gap-2">{item.icon}{item.label}</Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="text-sm font-medium text-slate-500">Highlights</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm"><span>Latency p95</span><Badge variant="outline">~5.1s</Badge></div>
                <div className="flex items-center justify-between text-sm"><span>Draft accept rate</span><Badge className="bg-emerald-600">72%</Badge></div>
                <div className="flex items-center justify-between text-sm"><span>Voice sessions today</span><Badge variant="secondary">38</Badge></div>
              </CardContent>
            </Card>
          </aside>

          <section className="lg:col-span-9 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 max-w-xl">
                <TabsTrigger value="voice" className="gap-2"><Mic className="h-4 w-4"/> Voice Input</TabsTrigger>
                <TabsTrigger value="review" className="gap-2" disabled={!draft}><ListChecks className="h-4 w-4"/> Review & Edit</TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2" disabled={!draft}><Calendar className="h-4 w-4"/> Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="voice" className="space-y-6">
                <Card className="overflow-hidden border-0 shadow-sm">
                  <div className="p-6 grid md:grid-cols-2 gap-6 items-center bg-gradient-to-br from-emerald-50 to-white">
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-600"/> Voice → Plan</h2>
                      <p className="text-slate-600">Press and hold to speak your brief. We&apos;ll parse intents, highlight key details, and draft a full plan you can edit before committing.</p>

                      <div className="flex items-center gap-3">
                        <Button onClick={handleRecordToggle} size="lg" className={`gap-2 rounded-full px-6 ${recording?"bg-rose-600 hover:bg-rose-700":"bg-emerald-600 hover:bg-emerald-700"}`} disabled={loading}>
                          {recording ? <Square className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
                          {recording ? "Stop Recording" : "Start Recording"}
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" onClick={generatePlan} className="gap-2" disabled={loading}><Wand2 className="h-4 w-4"/> {loading ? "Generating plan..." : "Generate Plan"}</Button>
                          </TooltipTrigger>
                          <TooltipContent>Use current transcript to generate a plan</TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="flex gap-2 mt-2">
                        {chips.map((chip, i) => (
                          <Badge key={i} className={cn("border-0 text-xs font-medium px-3 py-1", {
                            date: "bg-emerald-100 text-emerald-800",
                            team: "bg-amber-100 text-amber-800",
                            scope: "bg-sky-100 text-sky-800",
                            platform: "bg-purple-100 text-purple-800",
                            priority: "bg-rose-100 text-rose-800",
                          }[chip.kind])}>
                            {chip.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <Card className="border border-emerald-100 bg-white/60 backdrop-blur">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                          <div className="text-sm font-medium text-slate-500">Live Transcript</div>
                          <div className="flex gap-2">
                            {recording ? <PauseCircle className="h-4 w-4 text-rose-600"/> : <PlayCircle className="h-4 w-4 text-slate-400"/>}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea value={transcript} onChange={(e)=>setTranscript(e.target.value)} className="min-h-[140px]"/>
                          <div className="mt-3">
                            <div className="text-xs text-slate-500 mb-1">Signal</div>
                            <div className="flex items-end gap-1 h-10">
                              {new Array(32).fill(0).map((_, i) => (
                                <motion.div key={i} animate={{ height: recording ? Math.max(6, Math.random()*40) : 6 }} transition={{ duration: 0.25 }} className="w-1 rounded bg-emerald-500/60" />
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </Card>

                <QualityGates 
                  transcriptionConfidence={transcriptionConfidence}
                  intentExtraction={intentExtraction}
                  planningLatency={planningLatency}
                />
              </TabsContent>

              <TabsContent value="review" className="space-y-6">
                {!draft ? (
                  <Card className="border-dashed border-2">
                    <CardContent className="p-10 text-center text-slate-500">Generate a plan to review it here.</CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2"><Layers className="h-5 w-5 text-emerald-600"/> {draft.project.title}</h2>
                        <p className="text-slate-600 text-sm">{draft.project.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={saveDraft}><Save className="h-4 w-4"/> Save Draft</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={commitPlan}><Rocket className="h-4 w-4"/> Commit Plan</Button>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                      {draft.milestones.map((m) => (
                        <Card key={m.id} className="border-0 shadow-sm">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{m.title}</div>
                              <Badge variant="outline">{m.tasks.filter(t=>t.status==="done").length}/{m.tasks.length} done</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e)=>onDragEnd(e, m.id)}>
                              <SortableContext items={m.tasks.map(t=>t.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                  {m.tasks.map((t) => (
                                    <SortableTask key={t.id} task={t} onToggle={(id)=>toggleTask(m.id, id)} />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                            <div className="mt-3 flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="gap-2"><Plus className="h-4 w-4"/>Add task</Button>
                              <Button variant="ghost" size="sm" className="gap-2"><LinkIcon className="h-4 w-4"/>Link dependency</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="border-0">
                      <CardHeader className="pb-2"><div className="text-sm font-medium text-slate-500">Risks & Assumptions</div></CardHeader>
                      <CardContent className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="font-medium mb-2">Risks</div>
                          <ul className="space-y-2 list-disc list-inside text-slate-600">
                            {draft.risks.map((r, i) => (<li key={i}>{r}</li>))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-medium mb-2">Assumptions</div>
                          <ul className="space-y-2 list-disc list-inside text-slate-600">
                            {draft.assumptions.map((a, i) => (<li key={i}>{a}</li>))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline">
                <TimelineVisualization draft={draft} />
              </TabsContent>
            </Tabs>
          </section>
        </main>

        <footer className="py-8 border-t">
          <div className="mx-auto max-w-7xl px-6 text-xs text-slate-500 flex items-center justify-between">
            <span>© {new Date().getFullYear()} FOCO — Voice → Plan Prototype</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3"/> P95 plan: <b className="ml-1">~6s</b></span>
              <Separator orientation="vertical" className="h-4"/>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Accept rate: <b className="ml-1">72%</b></span>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
