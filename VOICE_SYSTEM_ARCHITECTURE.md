# Voice System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │ VoiceButton  │────▶│ VoiceInput   │────▶│VoiceConfirm  │        │
│  │ (Floating)   │     │ (Recording)  │     │   Dialog     │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│         │                     │                     │                │
│         │                     ▼                     │                │
│         │              ┌──────────────┐            │                │
│         │              │VoiceFeedback │            │                │
│         │              │  (Display)   │            │                │
│         │              └──────────────┘            │                │
│         │                                           │                │
│         └───────────┬──────────────────────────────┘                │
│                     │                                                │
│              ┌──────────────┐                                        │
│              │VoiceHistory  │                                        │
│              │  (Sidebar)   │                                        │
│              └──────────────┘                                        │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        State Management Layer                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                      ┌──────────────────────┐                        │
│                      │ useVoiceController   │                        │
│                      │    (Custom Hook)     │                        │
│                      ├──────────────────────┤                        │
│                      │ • Recording state    │                        │
│                      │ • Transcription      │                        │
│                      │ • Command execution  │                        │
│                      │ • Error handling     │                        │
│                      │ • Audio monitoring   │                        │
│                      └──────────┬───────────┘                        │
│                                 │                                     │
└─────────────────────────────────┼─────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ MediaRecorder│        │  Web Speech  │        │  Web Audio   │
│     API      │        │     API      │        │     API      │
│              │        │              │        │              │
│ • Record     │        │ • Transcribe │        │ • Visualize  │
│ • Stop       │        │ • Confidence │        │ • Monitor    │
└──────────────┘        └──────────────┘        └──────────────┘
        │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API Layer                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                    POST /api/crico/voice                             │
│                    ─────────────────────                             │
│                                                                       │
│    Actions:                                                          │
│    • process  → Process new voice command                            │
│    • confirm  → Confirm pending command                              │
│    • cancel   → Cancel pending command                               │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CRICO Backend Layer                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────┐             │
│  │        voice-controller.ts                          │             │
│  ├────────────────────────────────────────────────────┤             │
│  │                                                     │             │
│  │  processVoiceCommand()                             │             │
│  │    ↓                                                │             │
│  │  parseVoiceIntent()                                │             │
│  │    ├─ Extract domain (task/project/schema/etc.)    │             │
│  │    ├─ Extract action (create/delete/update/etc.)   │             │
│  │    ├─ Extract entities (parameters)                │             │
│  │    └─ Calculate confidence                         │             │
│  │    ↓                                                │             │
│  │  checkSafety()                                      │             │
│  │    ├─ Blocked keywords check                       │             │
│  │    ├─ Confidence threshold check                   │             │
│  │    ├─ Authority level assessment                   │             │
│  │    └─ Confirmation requirement                     │             │
│  │    ↓                                                │             │
│  │  createAction()                                     │             │
│  │    └─ Generate CRICO action                        │             │
│  │    ↓                                                │             │
│  │  executeAction() (if approved)                     │             │
│  │    └─ Perform the operation                        │             │
│  │                                                     │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                       │
│  ┌────────────────────────────────────────────────────┐             │
│  │        action-executor.ts                           │             │
│  ├────────────────────────────────────────────────────┤             │
│  │ • Create actions                                    │             │
│  │ • Validate permissions                              │             │
│  │ • Execute steps                                     │             │
│  │ • Handle rollbacks                                  │             │
│  │ • Audit logging                                     │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Database Layer                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Tables:                                                             │
│  ├─ crico_voice_commands    (all voice interactions)                │
│  ├─ crico_actions           (generated actions)                     │
│  ├─ crico_audit_log         (complete audit trail)                  │
│  └─ crico_agent_invocations (agent executions)                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Recording Flow
```
User clicks mic
    ↓
MediaRecorder starts
    ↓
Web Audio API monitors levels
    ↓
Waveform updates in real-time
    ↓
User clicks stop
    ↓
Audio blob created
```

### 2. Transcription Flow
```
Audio blob
    ↓
Web Speech API (Chrome/Safari)
    ↓
Transcript + confidence
    ↓
Send to backend
```

### 3. Processing Flow
```
POST /api/crico/voice
    ↓
Voice Controller
    ↓
Parse Intent
    ├─ Domain: task
    ├─ Action: create
    ├─ Entities: {description: "..."}
    └─ Confidence: 0.85
    ↓
Safety Check
    ├─ Blocked keywords: ❌ None
    ├─ Confidence: ✅ 85% > 60%
    └─ Authority: write (safe)
    ↓
Create Action
    ↓
Auto-execute (if safe)
    OR
    ↓
Request Confirmation (if risky)
```

### 4. Confirmation Flow (Risky Commands)
```
Command parsed
    ↓
Risk level: HIGH
    ↓
Show VoiceConfirmDialog
    ├─ Display intent
    ├─ Show parameters
    ├─ Risk indicator
    └─ Await user response
    ↓
User confirms ("yes" or button click)
    ↓
POST /api/crico/voice (action: confirm)
    ↓
Execute action
    ↓
Return feedback
```

### 5. Feedback Flow
```
Backend response
    ↓
Update state
    ↓
Display VoiceFeedback
    ├─ Visual (color-coded)
    └─ Audible (TTS)
    ↓
Store in history
```

## Authority Gates

```
┌──────────────────────────────────────────────────────────┐
│                    Authority Levels                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  READ           → Auto-execute                           │
│  ├─ list, show, get, status, check                       │
│  └─ No confirmation needed                               │
│                                                           │
│  WRITE          → Auto-execute                           │
│  ├─ create, update, modify                               │
│  └─ No confirmation (unless dangerous keywords)          │
│                                                           │
│  STRUCTURAL     → Requires Confirmation                  │
│  ├─ add_column, drop_column, migrate, deploy            │
│  └─ Shows confirmation dialog                            │
│                                                           │
│  DESTRUCTIVE    → Requires Confirmation                  │
│  ├─ delete, drop, truncate, destroy                      │
│  └─ Shows HIGH risk warning                              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Safety Layers

```
Layer 1: Blocked Keywords
  ├─ password, secret, api_key, token
  ├─ credit_card, ssn, social_security
  └─ Immediately reject if found

Layer 2: Confidence Thresholds
  ├─ STT Confidence ≥ 85%
  ├─ Intent Confidence ≥ 60%
  └─ Request clarification if below

Layer 3: Authority Gates
  ├─ Read: Always allowed
  ├─ Write: Allowed for safe operations
  ├─ Structural: Requires confirmation
  └─ Destructive: Requires confirmation

Layer 4: Environment Guards
  ├─ Production: Extra restrictions
  ├─ Staging: Normal restrictions
  └─ Development: Relaxed (but still audited)

Layer 5: Audit Trail
  ├─ Every command logged
  ├─ Every action logged
  ├─ Immutable records
  └─ Forensic-ready
```

## Component Hierarchy

```
RootLayout
  └─ Providers
      └─ TooltipProvider
          ├─ AppShell
          │   └─ {children} (page content)
          │
          └─ VoiceProvider (global)
              ├─ VoiceButton (floating)
              │   └─ Dialog
              │       ├─ VoiceInput
              │       │   ├─ Mic button
              │       │   ├─ Waveform
              │       │   └─ Status text
              │       │
              │       └─ VoiceFeedback
              │           ├─ Message
              │           ├─ Icon
              │           └─ Status
              │
              ├─ VoiceConfirmDialog
              │   ├─ Risk indicator
              │   ├─ Intent display
              │   ├─ Parameter list
              │   └─ Confirm/Cancel buttons
              │
              └─ VoiceHistory (sheet)
                  ├─ Command list
                  ├─ Status badges
                  ├─ Confidence bars
                  └─ Timestamps
```

## State Management

```typescript
VoiceControllerState {
  // Recording
  isRecording: boolean           // Currently recording audio
  audioLevel: number            // 0-1 for visualization

  // Processing
  isProcessing: boolean         // Backend processing
  transcript: string            // Transcribed text

  // Command
  command: VoiceCommand | null  // Active command object
  feedback: VoiceFeedback | null // System response

  // Error
  error: string | null          // Error message if any
}

VoiceCommand {
  id: string
  rawTranscript: string
  sttConfidence: number
  parsedIntent: Intent
  intentConfidence: number
  confirmationRequired: boolean
  status: VoiceStatus
  // ... metadata
}

Intent {
  domain: 'task' | 'project' | 'schema' | ...
  action: string
  entities: Record<string, unknown>
  confidence: number
}
```

## API Contract

```typescript
// Process new command
POST /api/crico/voice
{
  action: 'process',
  transcript: string,
  sttConfidence: number
}
→ Response {
  success: true,
  data: {
    commandId: string,
    status: VoiceStatus,
    feedback: VoiceFeedback,
    confirmationRequired: boolean,
    actionId?: string
  }
}

// Confirm pending command
POST /api/crico/voice
{
  action: 'confirm',
  commandId: string,
  transcript: 'yes' | 'no'
}
→ Response {
  success: true,
  data: {
    commandId: string,
    status: VoiceStatus,
    feedback: VoiceFeedback,
    actionId: string
  }
}

// Cancel command
POST /api/crico/voice
{
  action: 'cancel',
  commandId: string
}
→ Response {
  success: true,
  data: { cancelled: true }
}
```

## Interaction Patterns

### Pattern 1: Simple Command
```
User: "Show my tasks"
  ↓ (instant transcription)
Backend: Parse → Execute
  ↓ (200ms)
UI: Show tasks
TTS: "Here are your tasks"
```

### Pattern 2: Risky Command
```
User: "Delete all tasks"
  ↓
Backend: Parse → Risk: HIGH
  ↓
UI: Show confirmation dialog
  ↓ (user interaction)
User: "Yes" or click confirm
  ↓
Backend: Execute
  ↓
UI: Show result
TTS: "Done. All tasks deleted."
```

### Pattern 3: Low Confidence
```
User: "Uh, maybe create a task?"
  ↓
Backend: Parse → Confidence: 45%
  ↓
UI: Show clarification
TTS: "I'm not sure what you want to do. Can you be more specific?"
```

## Technology Stack

```
Frontend:
  ├─ React 18 (Components)
  ├─ TypeScript (Type safety)
  ├─ Tailwind CSS (Styling)
  ├─ shadcn/ui (UI primitives)
  ├─ Framer Motion (Animations)
  └─ Zustand (Could be added for global state)

Browser APIs:
  ├─ MediaRecorder (Audio recording)
  ├─ Web Audio API (Visualization)
  ├─ Web Speech API (Transcription + TTS)
  └─ localStorage (History persistence)

Backend:
  ├─ Next.js 14 (API routes)
  ├─ TypeScript (Type safety)
  └─ Supabase (Database + auth)

Future:
  ├─ OpenAI Whisper (Better transcription)
  ├─ LLM (Better intent parsing)
  └─ WebSockets (Real-time updates)
```

## Performance Characteristics

```
Operation                 Latency      Notes
────────────────────────────────────────────────
Open voice dialog        <50ms        React render
Start recording          <100ms       MediaRecorder init
Audio visualization      <10ms        60fps updates
Stop recording           <50ms        Blob creation
Transcription (browser)  Instant      Web Speech API
Transcription (Whisper)  ~1-2s        Network + processing
Intent parsing           ~100-300ms   Backend logic
Action execution         ~200-500ms   Varies by action
TTS feedback            Instant      Web Speech Synthesis
```

## Deployment Considerations

```
Development:
  ✅ Hot reload working
  ✅ Type checking enabled
  ✅ Lint on save
  ✅ Browser console debugging

Staging:
  ⚠️ Needs Whisper API key
  ⚠️ Enable production safety rules
  ✅ Full audit logging

Production:
  ⚠️ Whisper API required (browser fallback)
  ⚠️ Rate limiting on API endpoint
  ✅ Enhanced safety rules
  ✅ Forensic audit logging
  ⚠️ Analytics tracking
  ⚠️ Error monitoring (Sentry)
```

## Security Architecture

```
Frontend Security:
  ├─ No API keys in client code
  ├─ Input sanitization
  ├─ XSS prevention (React)
  └─ HTTPS only

API Security:
  ├─ Authentication required
  ├─ Rate limiting
  ├─ Input validation
  └─ CORS configured

Backend Security:
  ├─ Blocked keyword filtering
  ├─ Confidence thresholds
  ├─ Authority gates
  ├─ Audit logging
  └─ Environment guards

Database Security:
  ├─ Row-level security (RLS)
  ├─ Encrypted at rest
  ├─ Immutable audit logs
  └─ Backup retention
```

This architecture provides a **robust, secure, and scalable** voice command system that integrates seamlessly with the existing CRICO backend while maintaining all safety guarantees.
