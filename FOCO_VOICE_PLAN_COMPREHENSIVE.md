# FOCO Voice → Plan (V2) - Comprehensive Implementation Plan

## Executive Summary

**Vision**: Transform Foco into the world's most intuitive project management platform where users can speak their project ideas and receive fully structured, editable plans in under 60 seconds.

**Core Promise**: "Speak your roadmap. Ship your future."

**Technical Foundation**: Leverage existing Supabase database, Next.js architecture, and modern AI services to create a seamless voice-to-project pipeline.

---

## Current System Analysis

### Database Architecture Mapping

#### Existing Tables - Perfect Alignment

**Projects Table**
```sql
-- Current: projects (id, name, description, organization_id, status, priority, start_date, due_date, progress_percentage, created_by)
-- Voice Integration: Direct mapping with minimal enhancements
-- Enhancements Needed:
--   - voice_session_id (UUID) - For audit trail
--   - ai_generated (BOOLEAN) - Track AI-created projects
--   - confidence_score (DECIMAL) - AI confidence in plan quality
```

**Milestones Table**
```sql
-- Current: milestones (id, name, description, project_id, status, priority, deadline, progress_percentage, created_by)
-- Voice Integration: Direct mapping with field name standardization
-- Mapping:
--   - name → title (AI output uses 'title')
--   - deadline → due_date (standardize naming)
-- Enhancements:
--   - ai_generated (BOOLEAN)
--   - confidence_score (DECIMAL)
--   - estimated_completion (DATE)
```

**Tasks Table**
```sql
-- Current: tasks (id, title, description, project_id, milestone_id, status, priority, assignee_id, estimated_hours, actual_hours, due_date, created_by)
-- Voice Integration: PERFECT ALIGNMENT - No structural changes needed
-- Enhancements:
--   - ai_generated (BOOLEAN)
--   - dependency_links (JSONB) - Store task dependencies
--   - voice_extraction_source (TEXT) - Track AI reasoning
--   - confidence_score (DECIMAL)
```

### New Tables Required

#### Plan Sessions Table
```sql
CREATE TABLE plan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    transcript TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    plan_json JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.0,
    committed_project_id UUID REFERENCES projects(id),
    processing_time_ms INTEGER,
    audio_file_url TEXT, -- Temporary storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_plan_sessions_org_id ON plan_sessions(organization_id);
CREATE INDEX idx_plan_sessions_user_id ON plan_sessions(user_id);
CREATE INDEX idx_plan_sessions_created_at ON plan_sessions(created_at);
```

#### Voice Intents Table
```sql
CREATE TABLE voice_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES plan_sessions(id),
    intent_type VARCHAR(50) NOT NULL, -- 'create_project', 'set_date', 'assign_owner', etc.
    slot_name VARCHAR(100), -- 'project_title', 'assignee_name', 'date_range', etc.
    slot_value TEXT,
    confidence DECIMAL(3,2) DEFAULT 0.0,
    start_position INTEGER,
    end_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_voice_intents_session_id ON voice_intents(session_id);
CREATE INDEX idx_voice_intents_type ON voice_intents(intent_type);
```

#### AI Suggestions Table
```sql
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    suggestion_type VARCHAR(50) NOT NULL, -- 'task_split', 'milestone_add', 'risk_identify'
    content JSONB NOT NULL,
    context TEXT, -- What triggered this suggestion
    applied BOOLEAN DEFAULT FALSE,
    applied_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

#### 1.1 Database Extensions
**File**: `/database/migrations/033_add_voice_planning_tables.sql`

**Migration Steps**:
1. Create `plan_sessions` table with audit trail capabilities
2. Create `voice_intents` table for intent tracking
3. Create `ai_suggestions` table for learning system
4. Add voice-related columns to existing tables
5. Create performance indexes
6. Set up RLS policies for voice data

**Rollback Strategy**:
```sql
-- Safe rollback with data preservation
CREATE TABLE plan_sessions_backup AS SELECT * FROM plan_sessions;
-- Migration can be safely rolled back without data loss
```

#### 1.2 API Infrastructure

**Core Endpoints**:

**Session Management**
```typescript
// /api/voice/start-session
POST /api/voice/start-session
{
  organization_id: string,
  language: 'en' | 'es',
  context?: {
    current_project_id?: string,
    team_size?: number,
    timeline_preference?: 'aggressive' | 'conservative'
  }
}

Response:
{
  session_id: string,
  websocket_url: string,
  expires_at: string
}
```

**Audio Processing**
```typescript
// /api/voice/transcribe
POST /api/voice/transcribe
{
  session_id: string,
  audio_chunk: base64,
  is_final: boolean
}

Response:
{
  transcript: string,
  is_final: boolean,
  confidence: number,
  intents_detected: Intent[]
}
```

**Plan Generation**
```typescript
// /api/plan/generate
POST /api/plan/generate
{
  session_id: string,
  transcript: string,
  context: {
    organization_history: boolean,
    include_estimates: boolean,
    risk_assessment: boolean
  }
}

Response:
{
  plan_draft: PlanDraft,
  confidence: number,
  processing_time_ms: number,
  alternatives?: PlanDraft[]
}
```

#### 1.3 Authentication & Security

**Voice-Specific Security**:
- Session-based authentication for WebSocket connections
- Rate limiting: 10 voice sessions per hour per user
- Audio file encryption at rest
- PII redaction in transcripts
- GDPR compliance for voice data

**RLS Policies**:
```sql
-- Voice data isolation by organization
CREATE POLICY "Users can view own organization voice sessions" 
ON plan_sessions FOR SELECT 
USING (organization_id = current_organization_id());

CREATE POLICY "Users can create voice sessions in own organization"
ON plan_sessions FOR INSERT 
WITH CHECK (organization_id = current_organization_id());
```

---

### Phase 2: Voice Capture System (Weeks 3-4)

#### 2.1 Frontend Voice Components

**VoiceCaptureButton Component**
```typescript
// /components/voice/voice-capture-button.tsx
interface VoiceCaptureButtonProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
  language?: 'en' | 'es';
  disabled?: boolean;
  maxDuration?: number; // seconds
}

interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  audioLevel: number;
  duration: number;
}

// Key Features:
// - Hold-to-talk interaction
// - Real-time audio level visualization
// - Voice Activity Detection (VAD)
// - Noise cancellation
// - Automatic silence detection
// - Multi-language support
// - Accessibility: full keyboard navigation
```

**Technical Implementation**:
```typescript
class VoiceCaptureManager {
  private mediaRecorder: MediaRecorder;
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private websocket: WebSocket;
  
  async startRecording(): Promise<void> {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000
      }
    });
    
    // Setup Web Audio API for visualization
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    // Setup MediaRecorder for audio capture
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    // Start streaming to WebSocket
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.websocket.send(event.data);
      }
    };
    
    this.mediaRecorder.start(100); // 100ms chunks
  }
}
```

#### 2.2 Real-time Transcription

**WebSocket Implementation**:
```typescript
// /pages/api/realtime-audio.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (res.socket.server.ws) return;
  
  res.socket.server.ws = new WebSocketServer({ noServer: true });
  res.socket.server.on('upgrade', (request, socket, head) => {
    res.socket.server.ws.handleUpgrade(request, socket, head, (ws) => {
      res.socket.server.ws.emit('connection', ws, request);
    });
  });
  
  res.socket.server.ws.on('connection', (ws, request) => {
    const sessionId = request.url?.split('session=')[1];
    
    ws.on('message', async (data) => {
      const { type, audio_chunk, is_final } = JSON.parse(data.toString());
      
      if (type === 'audio_chunk') {
        // Stream to OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
          file: Buffer.from(audio_chunk, 'base64'),
          model: 'whisper-1',
          language: 'en',
          response_format: 'verbose_json'
        });
        
        ws.send(JSON.stringify({
          type: 'transcript',
          text: transcription.text,
          is_final: is_final,
          confidence: transcription.confidence
        }));
      }
    });
  });
}
```

#### 2.3 Intent Extraction

**Real-time Intent Detection**:
```typescript
// /lib/ai/intent-extractor.ts
interface Intent {
  type: 'create_project' | 'set_date' | 'assign_owner' | 'set_priority' | 'add_milestone';
  slot: string;
  value: string;
  confidence: number;
  range: [number, number];
}

class IntentExtractor {
  private patterns = {
    project_title: /(?:build|create|make|develop)\s+(.+?)(?:\s+(?:project|app|system))/i,
    date_range: /(?:by|before|after|due|deadline)\s+(.+)/i,
    assignee: /(?:assign|give|delegate)\s+(.+?)\s+(?:to|for)/i,
    priority: /(?:priority|urgent|critical|high|medium|low)/i
  };
  
  extractIntents(transcript: string): Intent[] {
    const intents: Intent[] = [];
    
    // Regex-based quick extraction
    for (const [slot, pattern] of Object.entries(this.patterns)) {
      const match = transcript.match(pattern);
      if (match) {
        intents.push({
          type: this.mapSlotToIntent(slot),
          slot,
          value: match[1].trim(),
          confidence: 0.8,
          range: [match.index, match.index + match[0].length]
        });
      }
    }
    
    // LLM-based refinement for complex cases
    return this.refineWithLLM(intents, transcript);
  }
}
```

---

## Phase 3: AI Planning System (Weeks 5-7)

### 3.1 OpenAI Integration

**Service Configuration**:
```typescript
// /lib/ai/openai-client.ts
class OpenAIClient {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });
  }
  
  async transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
    return await this.client.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
      language: 'en',
      temperature: 0.1,
      response_format: 'verbose_json'
    });
  }
  
  async generatePlan(transcript: string, context: PlanContext): Promise<PlanDraft> {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(transcript, context);
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  }
}
```

### 3.2 Prompt Engineering

**System Prompts**:
```typescript
const SYSTEM_PROMPTS = {
  planner: `You are FOCO Planner, an expert program manager AI with 15 years of experience in software development, marketing, and operations.

Your task: Convert informal project briefs into structured, actionable plans.

Guidelines:
1. Break projects into logical milestones (3-8 milestones max)
2. Each milestone should have 3-12 specific tasks
3. Tasks should be actionable and specific
4. Consider team size and timeline constraints
5. Identify potential risks and assumptions
6. Provide realistic effort estimates
7. Suggest appropriate priorities

Output Format: Valid JSON matching the PlanDraft schema exactly.

Focus on clarity and feasibility over ambition. Better to under-promise and over-deliver.`,

  estimator: `You are a project estimation specialist. Based on historical data and task complexity, provide accurate effort estimates.

Consider:
- Task complexity (simple, moderate, complex)
- Dependencies and coordination overhead
- Research and discovery time
- Testing and validation
- Buffer for unexpected issues (15-25%)

Return estimates in hours with confidence scores (0.0-1.0).`,

  refiner: `You are a project refinement specialist. Take user feedback and apply precise modifications to existing plans.

Common operations:
- Split tasks into smaller components
- Merge related tasks
- Adjust timelines and dependencies
- Reassign resources
- Add or remove milestones
- Reprioritize based on new constraints

Always maintain plan coherence and logical flow.`
};
```

### 3.3 Context Gathering

**Organization Context Service**:
```typescript
// /lib/context/organization-context.ts
class OrganizationContextService {
  async gatherContext(organizationId: string, userId: string): Promise<PlanContext> {
    const [
      orgProfile,
      recentProjects,
      teamMembers,
      velocityData,
      preferences
    ] = await Promise.all([
      this.getOrganizationProfile(organizationId),
      this.getRecentProjects(organizationId, 10),
      this.getTeamMembers(organizationId),
      this.getVelocityData(organizationId, 90),
      this.getUserPreferences(userId)
    ]);
    
    return {
      organization: orgProfile,
      team_size: teamMembers.length,
      avg_velocity: velocityData.avg_hours_per_week,
      recent_patterns: this.extractPatterns(recentProjects),
      available_skills: this.extractSkills(teamMembers),
      timezone: orgProfile.timezone,
      working_days: orgProfile.settings.working_days,
      preferences
    };
  }
  
  private extractPatterns(projects: Project[]): ProjectPattern[] {
    // Analyze past projects for common patterns
    // - Typical milestone structures
    // - Common task types
    // - Average effort by task type
    // - Preferred naming conventions
    // - Risk patterns
  }
}
```

---

## Phase 4: Plan Review Interface (Weeks 8-9)

### 4.1 Review Components Architecture

**PlanReviewPanel Component**:
```typescript
// /components/plan/plan-review-panel.tsx
interface PlanReviewPanelProps {
  planDraft: PlanDraft;
  organizationContext: OrganizationContext;
  onEdit: (updates: PlanDraft) => void;
  onCommit: () => void;
  onRefine: (command: string) => void;
}

interface PlanReviewState {
  editedPlan: PlanDraft;
  validationErrors: ValidationError[];
  isCommitting: boolean;
  expandedMilestones: Set<string>;
  selectedTasks: Set<string>;
}

const PlanReviewPanel: React.FC<PlanReviewPanelProps> = ({
  planDraft,
  organizationContext,
  onEdit,
  onCommit,
  onRefine
}) => {
  // Features:
  // - Editable milestone/task tree
  // - Drag-and-drop reorganization
  // - Inline editing with validation
  // - Dependency visualization
  // - Effort estimate adjustment
  // - Assignment from org directory
  // - Real-time collaboration
  // - Keyboard shortcuts
  // - Undo/redo functionality
};
```

**Timeline Visualization**:
```typescript
// /components/plan/plan-timeline.tsx
interface PlanTimelineProps {
  milestones: Milestone[];
  tasks: Task[];
  onEditDate: (itemId: string, newDate: Date) => void;
  onLinkDependency: (fromId: string, toId: string) => void;
}

// Features:
// - Gantt-style visualization
// - Interactive milestone editing
// - Dependency drag-links
// - Critical path highlighting
// - Timeline conflict warnings
// - Zoom and pan capabilities
// - Export to image/PDF
```

### 4.2 Editing Capabilities

**Inline Editing System**:
```typescript
// /lib/editing/plan-editor.ts
class PlanEditor {
  private history: PlanDraft[] = [];
  private historyIndex = -1;
  
  editTask(taskId: string, updates: Partial<Task>): void {
    const newPlan = this.cloneCurrentPlan();
    const task = this.findTask(newPlan, taskId);
    
    if (task) {
      Object.assign(task, updates);
      this.validatePlan(newPlan);
      this.saveToHistory(newPlan);
    }
  }
  
  splitTask(taskId: string, splitPoint: number): void {
    const task = this.findTask(this.currentPlan, taskId);
    if (!task) return;
    
    const [part1, part2] = this.splitTaskDescription(task.description, splitPoint);
    
    const newTasks: Task[] = [
      { ...task, title: `${task.title} - Part 1`, description: part1 },
      { ...task, title: `${task.title} - Part 2`, description: part2 }
    ];
    
    this.replaceTask(taskId, newTasks);
  }
  
  autoEstimateFromHistory(tasks: Task[]): void {
    // Use historical data to improve estimates
    const historicalData = this.getHistoricalData();
    
    tasks.forEach(task => {
      const similarTasks = historicalData.filter(t => 
        this.calculateSimilarity(task, t) > 0.7
      );
      
      if (similarTasks.length > 0) {
        const avgHours = similarTasks.reduce((sum, t) => sum + t.actual_hours, 0) / similarTasks.length;
        task.estimated_hours = Math.round(avgHours * 1.1); // 10% buffer
      }
    });
  }
}
```

### 4.3 Validation System

**Plan Validation**:
```typescript
// /lib/validation/plan-validator.ts
interface ValidationError {
  type: 'error' | 'warning' | 'info';
  itemId: string;
  itemType: 'project' | 'milestone' | 'task';
  message: string;
  suggestion?: string;
}

class PlanValidator {
  validatePlan(plan: PlanDraft): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Project-level validation
    errors.push(...this.validateProject(plan.project));
    
    // Milestone validation
    plan.milestones.forEach(milestone => {
      errors.push(...this.validateMilestone(milestone));
    });
    
    // Task validation
    plan.tasks.forEach(task => {
      errors.push(...this.validateTask(task));
    });
    
    // Cross-entity validation
    errors.push(...this.validateDependencies(plan));
    errors.push(...this.validateTimeline(plan));
    errors.push(...this.validateResources(plan));
    
    return errors;
  }
  
  private validateTimeline(plan: PlanDraft): ValidationError[] {
    const errors: ValidationError[] = [];
    const timeline = this.buildTimeline(plan);
    
    // Check for date conflicts
    const conflicts = this.findDateConflicts(timeline);
    conflicts.forEach(conflict => {
      errors.push({
        type: 'warning',
        itemId: conflict.taskId,
        itemType: 'task',
        message: `Task conflicts with ${conflict.conflictingTask}`,
        suggestion: 'Adjust dates or remove dependency'
      });
    });
    
    // Check critical path
    const criticalPath = this.calculateCriticalPath(plan);
    if (criticalPath.duration > this.getTimelineThreshold(plan)) {
      errors.push({
        type: 'warning',
        itemId: plan.project.id,
        itemType: 'project',
        message: `Critical path exceeds timeline by ${criticalPath.excessDays} days`,
        suggestion: 'Consider adding resources or reducing scope'
      });
    }
    
    return errors;
  }
}
```

---

## Phase 5: Commit & Integration (Week 10)

### 5.1 Transactional Commit System

**Commit Service**:
```typescript
// /lib/plan/commit-service.ts
class PlanCommitService {
  async commitPlan(
    sessionId: string,
    planDraft: PlanDraft,
    userId: string
  ): Promise<CommitResult> {
    const startTime = Date.now();
    
    // Start database transaction
    const { data, error } = await supabase.rpc('commit_voice_plan', {
      p_session_id: sessionId,
      p_plan_draft: planDraft,
      p_user_id: userId
    });
    
    if (error) {
      throw new CommitError(`Failed to commit plan: ${error.message}`);
    }
    
    // Emit real-time updates
    await this.emitRealtimeUpdates(data);
    
    // Generate activity feed
    await this.createActivityFeed(data, userId);
    
    // Send notifications
    await this.sendNotifications(data, userId);
    
    return {
      project_id: data.project_id,
      milestone_ids: data.milestone_ids,
      task_ids: data.task_ids,
      commit_time_ms: Date.now() - startTime
    };
  }
}
```

**Database Function**:
```sql
-- /database/functions/commit_voice_plan.sql
CREATE OR REPLACE FUNCTION commit_voice_plan(
  p_session_id UUID,
  p_plan_draft JSONB,
  p_user_id UUID
) RETURNS TABLE (
  project_id UUID,
  milestone_ids UUID[],
  task_ids UUID[]
) LANGUAGE plpgsql AS $$
DECLARE
  v_project_id UUID;
  v_milestone_ids UUID[] := '{}';
  v_task_ids UUID[] := '{}';
  v_milestone JSONB;
  v_task JSONB;
BEGIN
  -- Start transaction
  INSERT INTO projects (
    name, description, organization_id, created_by, status,
    voice_session_id, ai_generated
  ) VALUES (
    (p_plan_draft->>'project'->>'title'),
    (p_plan_draft->>'project'->>'description'),
    (SELECT organization_id FROM plan_sessions WHERE id = p_session_id),
    p_user_id,
    'planning',
    p_session_id,
    true
  ) RETURNING id INTO v_project_id;
  
  -- Insert milestones
  FOR v_milestone IN SELECT * FROM jsonb_array_elements(p_plan_draft->'milestones')
  LOOP
    INSERT INTO milestones (
      name, description, project_id, created_by, priority,
      ai_generated, confidence_score
    ) VALUES (
      v_milestone->>'title',
      v_milestone->>'description',
      v_project_id,
      p_user_id,
      COALESCE(v_milestone->>'priority', 'medium'),
      true,
      (v_milestone->>'confidence')::DECIMAL
    ) RETURNING id INTO v_milestone_ids[array_length(v_milestone_ids, 1) + 1];
  END LOOP;
  
  -- Insert tasks
  FOR v_task IN SELECT * FROM jsonb_array_elements(p_plan_draft->'tasks')
  LOOP
    INSERT INTO tasks (
      title, description, project_id, milestone_id, created_by,
      priority, estimated_hours, ai_generated, dependency_links
    ) VALUES (
      v_task->>'title',
      v_task->>'description',
      v_project_id,
      v_milestone_ids[1], -- Simplified mapping
      p_user_id,
      COALESCE(v_task->>'priority', 'medium'),
      (v_task->>'estimate_hours')::INTEGER,
      true,
      v_task->'dependencies'
    ) RETURNING id INTO v_task_ids[array_length(v_task_ids, 1) + 1];
  END LOOP;
  
  -- Update session with committed project
  UPDATE plan_sessions 
  SET committed_project_id = v_project_id 
  WHERE id = p_session_id;
  
  RETURN NEXT;
END;
$$;
```

### 5.2 Real-time Updates

**WebSocket Events**:
```typescript
// /lib/realtime/plan-events.ts
class PlanEventEmitter {
  async emitPlanCreated(projectId: string, organizationId: string): Promise<void> {
    const channel = supabase.channel(`org:${organizationId}:projects`);
    
    await channel.send({
      type: 'broadcast',
      event: 'plan_created',
      payload: {
        project_id: projectId,
        created_by: await this.getUserId(),
        created_at: new Date().toISOString()
      }
    });
  }
  
  async emitPlanUpdated(
    projectId: string, 
    changes: PlanChange[],
    organizationId: string
  ): Promise<void> {
    const channel = supabase.channel(`org:${organizationId}:projects`);
    
    await channel.send({
      type: 'broadcast',
      event: 'plan_updated',
      payload: {
        project_id: projectId,
        changes,
        updated_by: await this.getUserId(),
        updated_at: new Date().toISOString()
      }
    });
  }
}
```

---

## Performance Optimization

### Frontend Optimization

**Audio Processing**:
```typescript
// /lib/performance/audio-optimizer.ts
class AudioOptimizer {
  private worker: Worker;
  
  constructor() {
    this.worker = new Worker('/workers/audio-processor.js');
  }
  
  async optimizeAudioStream(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      this.worker.postMessage({ audioBuffer }, [audioBuffer]);
      this.worker.onmessage = (event) => resolve(event.data);
    });
  }
}

// Web Worker for audio processing
// /public/workers/audio-processor.js
self.onmessage = function(event) {
  const { audioBuffer } = event.data;
  
  // Noise reduction
  const cleanedBuffer = applyNoiseReduction(audioBuffer);
  
  // Compression
  const compressedBuffer = compressAudio(cleanedBuffer);
  
  self.postMessage(compressedBuffer, [compressedBuffer]);
};
```

**Virtual Scrolling**:
```typescript
// /components/ui/virtual-task-list.tsx
const VirtualTaskList: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 5 // Render 5 extra rows above/below
  });
  
  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <TaskItem task={tasks[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Backend Optimization

**Database Optimization**:
```sql
-- Performance indexes for voice features
CREATE INDEX CONCURRENTLY idx_plan_sessions_org_created 
ON plan_sessions(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_tasks_project_milestone 
ON tasks(project_id, milestone_id, status);

CREATE INDEX CONCURRENTLY idx_voice_intents_session_type 
ON voice_intents(session_id, intent_type);

-- Partition large tables for better performance
CREATE TABLE plan_sessions_2024 PARTITION OF plan_sessions
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

**Caching Strategy**:
```typescript
// /lib/cache/plan-cache.ts
class PlanCache {
  private redis: Redis;
  
  async cachePlanDraft(sessionId: string, planDraft: PlanDraft): Promise<void> {
    const key = `plan_draft:${sessionId}`;
    await this.redis.setex(key, 3600, JSON.stringify(planDraft)); // 1 hour TTL
  }
  
  async getCachedPlanDraft(sessionId: string): Promise<PlanDraft | null> {
    const key = `plan_draft:${sessionId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async cacheOrganizationContext(orgId: string, context: OrganizationContext): Promise<void> {
    const key = `org_context:${orgId}`;
    await this.redis.setex(key, 1800, JSON.stringify(context)); // 30 minutes TTL
  }
}
```

---

## Testing Strategy

### Unit Testing

**Voice Components**:
```typescript
// /components/voice/__tests__/voice-capture-button.test.tsx
describe('VoiceCaptureButton', () => {
  it('should request microphone permission on mount', async () => {
    const mockGetUserMedia = jest.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia }
    });
    
    render(<VoiceCaptureButton onTranscript={jest.fn()} />);
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
    });
  });
  
  it('should start recording on mouse down', async () => {
    const onTranscript = jest.fn();
    const { getByRole } = render(
      <VoiceCaptureButton onTranscript={onTranscript} />
    );
    
    const button = getByRole('button');
    fireEvent.mouseDown(button);
    
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
  
  it('should handle microphone permission denial', async () => {
    const mockGetUserMedia = jest.fn().mockRejectedValue(
      new Error('Permission denied')
    );
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia }
    });
    
    const onError = jest.fn();
    render(<VoiceCaptureButton onTranscript={jest.fn()} onError={onError} />);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Permission denied')
        })
      );
    });
  });
});
```

**AI Service Testing**:
```typescript
// /lib/ai/__tests__/plan-orchestrator.test.ts
describe('PlanOrchestrator', () => {
  let orchestrator: PlanOrchestrator;
  let mockOpenAI: jest.Mocked<OpenAI>;
  
  beforeEach(() => {
    mockOpenAI = createMockOpenAI();
    orchestrator = new PlanOrchestrator(mockOpenAI);
  });
  
  it('should generate plan from transcript', async () => {
    const transcript = 'Build a mobile app with auth and dashboard';
    const context = createMockContext();
    
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: { content: JSON.stringify(mockPlanDraft) }
      }]
    });
    
    const result = await orchestrator.generatePlan(transcript, context);
    
    expect(result).toEqual(mockPlanDraft);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: expect.stringContaining('FOCO Planner') },
        { role: 'user', content: expect.stringContaining(transcript) }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });
  });
  
  it('should handle API failures gracefully', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue(
      new Error('API rate limit exceeded')
    );
    
    await expect(
      orchestrator.generatePlan('test transcript', createMockContext())
    ).rejects.toThrow('Failed to generate plan');
  });
});
```

### Integration Testing

**End-to-End Voice Flow**:
```typescript
// /e2e/voice-to-plan.test.ts
test('voice to plan complete flow', async ({ page }) => {
  // Mock audio capture
  await page.addInitScript(() => {
    window.MediaRecorder = class MockMediaRecorder {
      start() { this.onstart?.(); }
      stop() { this.onstop?.(); }
      ondataavailable = () => {};
    };
  });
  
  await page.goto('/dashboard');
  
  // Start voice capture
  await page.click('[data-testid="voice-capture-button"]');
  await page.fill('[data-testid="voice-input"]', 'Build a task management app');
  await page.click('[data-testid="voice-submit"]');
  
  // Wait for plan generation
  await page.waitForSelector('[data-testid="plan-review-panel"]');
  
  // Verify plan structure
  await expect(page.locator('[data-testid="project-title"]')).toHaveText('Task Management App');
  await expect(page.locator('[data-testid="milestone"]')).toHaveCount.greaterThan(0);
  await expect(page.locator('[data-testid="task"]')).toHaveCount.greaterThan(0);
  
  // Edit plan
  await page.fill('[data-testid="task-title-0"]', 'User Authentication');
  await page.click('[data-testid="commit-plan"]');
  
  // Verify commit
  await page.waitForSelector('[data-testid="success-message"]');
  await expect(page.locator('[data-testid="project-id"]')).toBeVisible();
});
```

---

## Success Metrics & Monitoring

### Key Performance Indicators

**Technical Metrics**:
```typescript
// /lib/metrics/voice-metrics.ts
interface VoiceMetrics {
  latency: {
    audio_capture_p95: number; // Target: < 100ms
    transcription_p95: number; // Target: < 1200ms
    plan_generation_p95: number; // Target: < 6000ms
    total_flow_p95: number; // Target: < 8000ms
  };
  accuracy: {
    intent_extraction_f1: number; // Target: > 0.85
    transcription_wer: number; // Target: < 0.1
    plan_acceptance_rate: number; // Target: > 0.7
  };
  usage: {
    daily_voice_sessions: number;
    voice_adoption_rate: number; // Target: > 0.4
    average_refinements_per_plan: number;
  };
}

class MetricsCollector {
  async recordVoiceSession(sessionId: string, metrics: VoiceSessionMetrics): Promise<void> {
    await this.redis.zadd('voice_sessions_latency', metrics.total_latency, sessionId);
    await this.redis.hset('voice_sessions_accuracy', sessionId, JSON.stringify(metrics.accuracy));
    
    // Track patterns for improvement
    if (metrics.accuracy.transcription_wer > 0.2) {
      await this.trackPoorTranscription(sessionId, metrics.transcript);
    }
  }
}
```

**Business Metrics**:
```typescript
// /lib/analytics/business-analytics.ts
class BusinessAnalytics {
  async calculateProductivityGain(organizationId: string, timeframe: number): Promise<ProductivityMetrics> {
    const [voiceProjects, manualProjects] = await Promise.all([
      this.getVoiceCreatedProjects(organizationId, timeframe),
      this.getManuallyCreatedProjects(organizationId, timeframe)
    ]);
    
    const voiceAvgCreationTime = this.calculateAverageCreationTime(voiceProjects);
    const manualAvgCreationTime = this.calculateAverageCreationTime(manualProjects);
    
    return {
      productivity_gain_percent: ((manualAvgCreationTime - voiceAvgCreationTime) / manualAvgCreationTime) * 100,
      time_saved_minutes: (manualAvgCreationTime - voiceAvgCreationTime) / 60,
      voice_adoption_rate: voiceProjects.length / (voiceProjects.length + manualProjects.length)
    };
  }
}
```

### Monitoring & Alerting

**Real-time Monitoring**:
```typescript
// /lib/monitoring/health-monitor.ts
class HealthMonitor {
  async checkVoiceServices(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkOpenAIAPI(),
      this.checkWebSocketConnections(),
      this.checkDatabaseLatency(),
      this.checkRedisConnection()
    ]);
    
    const status = checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded';
    
    if (status === 'degraded') {
      await this.alertDevTeam(checks);
    }
    
    return { status, checks, timestamp: new Date().toISOString() };
  }
  
  private async alertDevTeam(checks: PromiseSettledResult<any>[]): Promise<void> {
    const failedChecks = checks
      .map((check, index) => ({ check, index }))
      .filter(({ check }) => check.status === 'rejected');
    
    await this.slackClient.post({
      channel: '#alerts',
      text: `🚨 Voice Service Health Check Failed: ${failedChecks.length} services down`
    });
  }
}
```

---

## Privacy & Security

### Data Protection

**Voice Data Handling**:
```typescript
// /lib/security/voice-security.ts
class VoiceSecurityManager {
  async processAudioWithPIIProtection(audioBuffer: Buffer): Promise<Buffer> {
    // Transcribe with PII detection
    const transcription = await this.openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm'),
      model: 'whisper-1',
      response_format: 'verbose_json'
    });
    
    // Redact PII from transcript
    const redactedTranscript = await this.redactPII(transcription.text);
    
    // Store only redacted version
    await this.storeTranscript(redactedTranscript);
    
    // Delete original audio after 24 hours
    await this.scheduleAudioDeletion(audioBuffer);
    
    return audioBuffer;
  }
  
  private async redactPII(text: string): Promise<string> {
    const piiPatterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
    };
    
    let redacted = text;
    for (const [type, pattern] of Object.entries(piiPatterns)) {
      redacted = redacted.replace(pattern, `[${type.toUpperCase()}]`);
    }
    
    return redacted;
  }
}
```

**Compliance Framework**:
```typescript
// /lib/compliance/gdpr-compliance.ts
class GDPRCompliance {
  async handleDataDeletionRequest(userId: string): Promise<void> {
    // Delete all voice data for user
    await this.supabase
      .from('plan_sessions')
      .delete()
      .eq('user_id', userId);
    
    await this.supabase
      .from('voice_intents')
      .delete()
      .eq('session_id', userId);
    
    // Delete audio files from storage
    const audioFiles = await this.listUserAudioFiles(userId);
    await Promise.all(audioFiles.map(file => this.deleteFile(file)));
    
    // Log deletion for audit
    await this.logDataDeletion(userId, 'GDPR deletion request');
  }
  
  async exportUserData(userId: string): Promise<UserDataExport> {
    const [sessions, intents, projects] = await Promise.all([
      this.getUserPlanSessions(userId),
      this.getUserVoiceIntents(userId),
      this.getUserProjects(userId)
    ]);
    
    return {
      plan_sessions: sessions,
      voice_intents: intents,
      created_projects: projects,
      export_date: new Date().toISOString()
    };
  }
}
```

---

## Rollout Strategy

### Phase 1: Internal Beta (Weeks 1-2)

**Target**: Internal team + 5 friendly customers
**Features**: Basic voice capture + plan generation
**Success Criteria**:
- Latency < 10 seconds for full plan generation
- Transcription accuracy > 70%
- Plan acceptance rate > 60%
- Zero critical security issues

**Monitoring**:
```typescript
// /lib/rollout/beta-monitor.ts
class BetaMonitor {
  async trackBetaMetrics(): Promise<BetaReport> {
    const metrics = await this.gatherMetrics();
    
    if (metrics.latency_p95 > 10000) {
      await this.triggerLatencyAlert();
    }
    
    if (metrics.accuracy < 0.7) {
      await this.triggerAccuracyAlert();
    }
    
    return {
      status: this.calculateBetaStatus(metrics),
      recommendations: this.generateRecommendations(metrics),
      next_steps: this.planNextSteps(metrics)
    };
  }
}
```

### Phase 2: Limited Release (Weeks 3-6)

**Target**: 100 customers with opt-in
**Features**: Full voice pipeline + refinement capabilities
**Success Criteria**:
- Voice adoption rate > 20%
- User satisfaction > 4.0/5
- Support ticket volume < 5% of voice sessions
- Performance targets met 95% of time

### Phase 3: General Availability (Weeks 7+)

**Target**: All customers
**Features**: Complete voice-to-plan platform
**Success Criteria**: Meet all success metrics defined in KPIs

---

## Next Steps

### Immediate Actions (This Week)

1. **Database Migration**
   ```bash
   # Create migration file
   touch database/migrations/033_add_voice_planning_tables.sql
   
   # Run migration in development
   supabase db push
   ```

2. **OpenAI Setup**
   ```bash
   # Add environment variables
   echo "OPENAI_API_KEY=your_key" >> .env.local
   echo "OPENAI_ORG_ID=your_org" >> .env.local
   
   # Test API connection
   npm run test:openai
   ```

3. **Component Scaffolding**
   ```bash
   # Create component directories
   mkdir -p src/components/voice
   mkdir -p src/components/plan
   mkdir -p src/lib/ai
   mkdir -p src/lib/voice
   ```

### Short-term Goals (Next 2 Weeks)

1. Complete Phase 1 foundation
2. Build working voice capture prototype
3. Implement basic plan generation
4. Set up comprehensive testing

### Long-term Vision (Next 3 Months)

1. Multi-language support (Spanish, French, German)
2. Advanced refinement capabilities
3. Voice analytics and insights
4. Enterprise features and compliance
5. Mobile app voice integration

---

## Conclusion

This comprehensive plan transforms Foco into a revolutionary voice-powered project management platform. By leveraging your existing robust architecture and adding cutting-edge AI capabilities, we'll create an experience that feels like magic to users while maintaining the reliability and scalability your customers expect.

The phased approach ensures we can deliver value quickly while building toward the full vision. With proper execution, Foco will become the undisputed leader in AI-powered project management.