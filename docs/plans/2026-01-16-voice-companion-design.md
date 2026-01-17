# Voice Companion Architecture Design

**Date:** 2026-01-16
**Status:** Ready for implementation

## Executive Summary

Transform Foco's voice assistant from a basic command processor into a powerful AI companion that can naturally understand and execute any operation in the system, with proper security controls and natural voice feedback.

## Current State

### Strengths
- Solid safety controls (blocked keywords, confirmation workflows)
- 5-gate authority system (source, intent, risk, approval, execution)
- Immutable audit trail with SHA-256 checksums
- OpenAI Whisper transcription working
- 40+ operations defined that could be voice-accessible

### Critical Gaps
1. **Regex-based intent parsing** - Brittle, fails on natural language variations
2. **No conversational context** - Can't say "complete it" after "create a task"
3. **No voice feedback** - Text only, no TTS responses
4. **Limited operations** - Only ~10 of 40+ operations actually wired up
5. **Missing RLS policies** - Destructive voice ops need admin verification

## Architecture Design

### Phase 1: LLM-Based Intent Parsing (Critical)

Replace regex parsing with DeepSeek-powered intent extraction:

```typescript
// src/lib/crico/voice/llm-intent-parser.ts
interface ParsedVoiceIntent {
  domain: 'task' | 'project' | 'search' | 'team' | 'dashboard' | 'settings';
  action: string;
  entities: Record<string, unknown>;
  confidence: number;
  requiresConfirmation: boolean;
  missingParams: string[];
}

async function parseIntentWithLLM(
  transcript: string,
  context: ConversationContext
): Promise<ParsedVoiceIntent>
```

**Prompt Template:**
```
You are the voice command parser for Foco, a project management app.

Parse this voice command: "${transcript}"

Context:
- Current workspace: ${workspaceName}
- Current project: ${projectName || 'none'}
- Recent entities: ${recentEntities}
- Last command: ${lastCommand}

Extract:
- domain: task|project|search|team|dashboard|settings
- action: create|update|delete|list|complete|assign|move|archive|search
- entities: all mentioned items (task names, people, dates, priorities)
- confidence: 0-1 based on clarity
- requiresConfirmation: true if destructive
- missingParams: what info is needed to execute

Respond ONLY with valid JSON.
```

### Phase 2: Conversational Context

Add session-based context tracking:

```typescript
// src/lib/crico/voice/conversation-context.ts
interface ConversationContext {
  sessionId: string;
  userId: string;
  workspaceId: string;

  // Recent references
  lastMentionedTask?: { id: string; title: string };
  lastMentionedProject?: { id: string; name: string };
  lastMentionedPerson?: { id: string; name: string };

  // Conversation history (last 5 turns)
  history: Array<{
    transcript: string;
    intent: ParsedVoiceIntent;
    result: 'success' | 'failed' | 'clarification';
  }>;

  // Pending operations
  awaitingConfirmation?: {
    commandId: string;
    action: string;
    entities: Record<string, unknown>;
  };
}
```

### Phase 3: Voice Feedback (TTS)

**Option A: ElevenLabs (Recommended)**
- 75ms latency, most natural voice
- Requires API key ($5-99/mo depending on usage)
- Voice cloning possible for branded assistant

**Option B: Browser Speech Synthesis (Free fallback)**
- 100-200ms latency
- Less natural but zero cost
- Works offline

```typescript
// src/lib/voice/tts-service.ts
interface TTSService {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): void;
  isSpeaking(): boolean;
}

// Use ElevenLabs if configured, fallback to browser
const tts = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsTTS()
  : new BrowserTTS();
```

### Phase 4: Extended Operations

Wire up remaining 30+ operations:

| Domain | Operations to Add |
|--------|-------------------|
| **Task** | subtasks, tags, time logging, comments |
| **Project** | team management, milestones, archive |
| **Search** | filter by status/priority/assignee/date |
| **Team** | invite, remove, change roles |
| **Dashboard** | metrics, reports, summaries |
| **Settings** | notification preferences |

### Phase 5: Voice-Specific RLS

Add database policies for voice operations:

```sql
-- Destructive voice operations require admin
CREATE POLICY "voice_delete_requires_admin" ON work_items
  FOR DELETE
  USING (
    user_has_workspace_access(workspace_id)
    AND (
      -- Non-voice deletes use standard rules
      current_setting('app.voice_command', true) IS NULL
      OR
      -- Voice deletes require admin
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = work_items.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    )
  );
```

## Implementation Priority

### Must Have (This Sprint)
1. LLM-based intent parsing with DeepSeek
2. Context tracking (last mentioned task/project/person)
3. Extended task operations (complete, assign, status change)
4. Browser TTS fallback for voice feedback

### Should Have (Next Sprint)
5. ElevenLabs integration for natural TTS
6. Multi-turn conversations (clarification flow)
7. Project and team voice operations
8. Voice-specific RLS policies

### Nice to Have (Future)
9. Voice cloning for branded assistant
10. Proactive suggestions ("You have 3 overdue tasks...")
11. Meeting integration (transcribe and create tasks)
12. Mobile-optimized voice UI

## External Dependencies

### Required
- **OpenAI Whisper** (already configured) - STT transcription
- **DeepSeek** (already configured) - Intent parsing

### Optional (Recommended)
- **ElevenLabs** - Natural TTS voice feedback
  - Pricing: $5/mo (30k chars) to $99/mo (500k chars)
  - API: https://api.elevenlabs.io/v1/text-to-speech

### Alternative (Free)
- **Browser Web Speech API** - Basic TTS (fallback)

## Success Metrics

1. **Intent Recognition**: >90% accuracy on natural language commands
2. **Response Latency**: <500ms average (STT + LLM + TTS)
3. **Completion Rate**: >85% of voice commands succeed without fallback
4. **User Adoption**: 30%+ of users try voice within first week
5. **Error Recovery**: >80% of failed commands recover via clarification

## Security Considerations

1. All voice operations respect existing RLS policies
2. Destructive operations always require confirmation
3. Sensitive keywords blocked (password, api_key, token, etc.)
4. Full audit trail with transcript and intent logging
5. Rate limiting: 3 voice commands per minute per user
6. Voice sessions tied to authenticated user

## Files to Modify

1. `src/lib/crico/voice/voice-controller.ts` - Replace regex with LLM
2. `src/app/api/crico/voice/route.ts` - Add context management
3. `src/hooks/useVoiceController.ts` - Add TTS playback
4. `src/lib/crico/actions/action-executor.ts` - Wire up more operations
5. `supabase/migrations/` - Add voice RLS policies
