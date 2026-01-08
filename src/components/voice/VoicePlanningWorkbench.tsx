import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, Square, Sparkles, Wand2, Calendar, User, Clock, CheckCircle2,
  ListChecks, Layers, Link as LinkIcon, Rocket, Save, PlayCircle, PauseCircle,
  Search, Plus, ChevronRight, ClipboardList, Settings, FileText, Workflow,
  Activity, BarChart3, Brain, Volume2, Target, Zap, AlertCircle, TrendingUp,
  Users, Lightbulb, ArrowRight, Loader2, Check
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-100",
    high: "bg-orange-100 text-orange-700 border-orange-100",
    critical: "bg-rose-100 text-rose-700 border-rose-100",
  };

  const statusIcons = {
    todo: <div className="h-3 w-3 rounded-full border-2 border-slate-300" />,
    in_progress: <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />,
    review: <AlertCircle className="h-3 w-3 text-amber-500" />,
    done: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
    blocked: <Square className="h-3 w-3 text-rose-500 rotate-45" />,
  };

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "group rounded-xl border bg-white/80 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-all duration-200",
        "hover:border-emerald-200 hover:bg-gradient-to-r hover:from-white hover:to-emerald-50/30",
        isDragging && "shadow-lg rotate-2 scale-105"
      )}
      layout
      
    >
      <div className="flex items-start gap-4">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing select-none text-slate-400 hover:text-slate-600 transition-colors mt-1"
        >
          <div className="flex flex-col gap-1">
            <div className="w-1 h-4 rounded-full bg-slate-300" />
            <div className="w-1 h-4 rounded-full bg-slate-300" />
          </div>
        </div>
        
        <motion.button 
          onClick={() => onToggle(task.id)} 
          className="flex-shrink-0 h-6 w-6 rounded-lg border-2 border-slate-200 flex items-center justify-center hover:border-emerald-400 transition-all duration-200 mt-0.5"
          aria-label={task.title}
          
        >
          {statusIcons[task.status]}
        </motion.button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-800 leading-tight truncate">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              <Badge className={cn("text-xs font-medium px-2 py-1 border", priorityColors[task.priority])}>
                {task.priority}
              </Badge>
              {Number.isFinite(task.estimate_hours) && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" /> 
                  <span className="font-medium">{task.estimate_hours}h</span>
                </div>
              )}
            </div>
          </div>
          
          {task.assignee_hint && (
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <User className="h-3 w-3" /> 
              <span className="font-medium">{task.assignee_hint}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface AudioVisualizerProps {
  isRecording: boolean
}

function AudioVisualizer({ isRecording }: AudioVisualizerProps) {
  return (
    <div className="flex items-end justify-center gap-1 h-12 px-4">
      <AnimatePresence>
        {new Array(24).fill(0).map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: 4 }}
            animate={{ 
              height: isRecording ? Math.max(8, Math.random() * 32) : 4,
              backgroundColor: isRecording ? "rgb(16 185 129)" : "rgb(148 163 184)"
            }}
            exit={{ height: 4 }}
            transition={{ 
              duration: 0.3, 
              delay: i * 0.02,
              repeat: isRecording ? Infinity : 0,
              repeatType: "reverse"
            }}
            className="w-1.5 rounded-full shadow-sm"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface QualityGatesProps {
  transcriptionConfidence: number
  intentExtraction: number
  planningLatency: number
}

function QualityGates({ transcriptionConfidence, intentExtraction, planningLatency }: QualityGatesProps) {
  const getQualityColor = (value: number) => {
    if (value >= 90) return "text-emerald-600 bg-emerald-100 border-emerald-200";
    if (value >= 70) return "text-amber-600 bg-amber-100 border-amber-100";
    return "text-rose-600 bg-rose-100 border-rose-100";
  };

  const getQualityIcon = (value: number) => {
    if (value >= 90) return <CheckCircle2 className="h-4 w-4" />;
    if (value >= 70) return <AlertCircle className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Quality Gates</h3>
                <p className="text-sm text-slate-500">Real-time performance metrics</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-6">
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Transcription</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">{transcriptionConfidence}%</span>
                  {getQualityIcon(transcriptionConfidence)}
                </div>
              </div>
              <div className="relative">
                <Progress value={transcriptionConfidence} className="h-2" />
                <div className={cn("absolute top-0 right-0 h-2 w-2 rounded-full", getQualityColor(transcriptionConfidence))} />
              </div>
            </motion.div>
            
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Intent Extraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">{intentExtraction}%</span>
                  {getQualityIcon(intentExtraction)}
                </div>
              </div>
              <div className="relative">
                <Progress value={intentExtraction} className="h-2" />
                <div className={cn("absolute top-0 right-0 h-2 w-2 rounded-full", getQualityColor(intentExtraction))} />
              </div>
            </motion.div>
            
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Planning Speed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">{planningLatency}%</span>
                  {getQualityIcon(planningLatency)}
                </div>
              </div>
              <div className="relative">
                <Progress value={planningLatency} className="h-2" />
                <div className={cn("absolute top-0 right-0 h-2 w-2 rounded-full", getQualityColor(planningLatency))} />
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
      <div className="text-slate-900">
        <AnimatePresence>
          {statusMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-auto max-w-3xl px-6 py-4 text-sm text-emerald-900 bg-emerald-100 border border-emerald-200 rounded-xl shadow-sm flex items-center gap-3"
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {statusMessage}
            </motion.div>
          )}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-auto max-w-3xl px-6 py-4 text-sm text-red-900 bg-red-100 border border-red-200 rounded-xl shadow-sm flex items-center gap-3"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <main className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Quick Nav</h3>
                      <p className="text-sm text-slate-500">Jump to any section</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {[
                    { icon: <ClipboardList className="h-4 w-4"/>, label: "Dashboard", shortcut: "D" },
                    { icon: <Workflow className="h-4 w-4"/>, label: "Projects", shortcut: "P" },
                    { icon: <Mic className="h-4 w-4"/>, label: "Voice → Plan (Beta)", shortcut: "V", active: true },
                    { icon: <FileText className="h-4 w-4"/>, label: "Reports", shortcut: "R" },
                  ].map((item, idx) => (
                    <motion.div key={idx}>
                      <Button 
                        variant={item.active ? "secondary" : "ghost"} 
                        className={cn(
                          "justify-start gap-3 h-12 px-4 rounded-xl transition-all duration-200",
                          item.active && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200",
                          !item.active && "hover:bg-slate-100 hover:text-slate-700"
                        )}
                      >
                        <div className={cn("flex items-center gap-3 flex-1")}>
                          <span className={cn(item.active && "text-emerald-600")}>{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-mono bg-slate-100 text-slate-500 rounded">
                          {item.shortcut}
                        </kbd>
                      </Button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Performance</h3>
                      <p className="text-sm text-slate-500">Today&apos;s metrics</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <motion.div 
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Latency p95</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono bg-white">~5.1s</Badge>
                  </motion.div>
                  <motion.div 
                    className="flex items-center justify-between p-3 rounded-lg bg-emerald-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">Accept rate</span>
                    </div>
                    <Badge className="text-xs font-mono bg-emerald-600 text-white border-emerald-600">72%</Badge>
                  </motion.div>
                  <motion.div 
                    className="flex items-center justify-between p-3 rounded-lg bg-blue-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Sessions</span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono bg-blue-100 text-blue-700 border-blue-200">38</Badge>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </aside>

          <motion.section 
            className="lg:col-span-9 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <TabsList className="grid grid-cols-3 max-w-2xl p-1 bg-slate-100 rounded-xl shadow-inner">
                  <TabsTrigger 
                    value="voice" 
                    className="gap-3 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 font-medium"
                  >
                    <Mic className="h-4 w-4" /> 
                    <span>Voice Input</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="review" 
                    disabled={!draft} 
                    className="gap-3 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    <ListChecks className="h-4 w-4" /> 
                    <span>Review & Edit</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="timeline" 
                    disabled={!draft} 
                    className="gap-3 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    <Calendar className="h-4 w-4" /> 
                    <span>Timeline</span>
                  </TabsTrigger>
                </TabsList>
              </motion.div>

              <TabsContent value="voice" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-emerald-50 to-blue-50">
                    <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
                      <motion.div 
                        className="space-y-6"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-lg">
                              <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold text-slate-800">Voice → Plan</h2>
                              <p className="text-slate-600">Transform your ideas into actionable plans</p>
                            </div>
                          </div>
                          <p className="text-slate-600 leading-relaxed">Speak your project brief naturally. Our AI will parse intents, extract key details, and generate a comprehensive plan you can edit and refine.</p>
                        </div>

                        <motion.div 
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div>
                            <Button 
                              onClick={handleRecordToggle} 
                              size="lg" 
                              variant={recording ? 'destructive' : 'default'}
                              className={cn("gap-3 rounded-full px-8 py-6 text-base font-semibold")}
                              disabled={loading}
                            >
                              {recording ? (
                                <><Square className="h-5 w-5" /><span>Stop Recording</span></>
                              ) : (
                                <><Mic className="h-5 w-5" /><span>Start Recording</span></>
                              )}
                            </Button>
                          </div>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                onClick={generatePlan} 
                                className={cn(
                                  "gap-2 rounded-full px-6 py-3 border-2 transition-all duration-200",
                                  loading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-primary/5"
                                )} 
                                disabled={loading}
                              >
                                {loading ? (
                                  <><Loader2 className="h-4 w-4 animate-spin" /><span>Generating...</span></>
                                ) : (
                                  <><Wand2 className="h-4 w-4" /><span>Generate Plan</span></>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-800 text-white border-slate-700">
                              <p>Use current transcript to generate a plan</p>
                            </TooltipContent>
                          </Tooltip>
                        </motion.div>

                        <div className="flex flex-wrap gap-2">
                          {chips.map((chip, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 + i * 0.05 }}
                            >
                              <Badge className={cn("border-0 text-xs font-medium px-3 py-1 shadow-sm", {
                                date: "bg-emerald-100 text-emerald-800",
                                team: "bg-amber-100 text-amber-800",
                                platform: "bg-blue-100 text-blue-800",
                                feature: "bg-purple-100 text-purple-800",
                                timeline: "bg-rose-100 text-rose-800"
                              }[chip.kind])}>
                                {chip.label}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      <motion.div 
                        className="space-y-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-2xl blur-xl opacity-20"></div>
                          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
                            <AudioVisualizer isRecording={recording} />
                            <div className="mt-4 text-center">
                              <p className="text-sm font-medium text-slate-700">
                                {recording ? "Listening... Speak clearly" : "Ready to record"}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {recording ? "Click Stop when finished" : "Click Start to begin"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">Transcript</h3>
                          <p className="text-sm text-slate-500">Edit or paste your project brief</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea 
                        value={transcript} 
                        onChange={(e)=>setTranscript(e.target.value)} 
                        className="min-h-[140px] border-slate-200 focus:border-emerald-400 focus:ring-emerald-100 resize-none"
                        placeholder="Describe your project, timeline, team, and key requirements..."
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{transcript.length} characters</span>
                        <Button variant="ghost" size="sm" onClick={() => setTranscript(demoBrief)}>
                          <Lightbulb className="h-3 w-3 mr-1" />
                          Use example
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

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
          </motion.section>
        </main>

        
      </div>
    </TooltipProvider>
  )
}
