-- Voice Conversations Table
-- Stores multi-turn conversational planning sessions for voice-first project management
-- Part of Foco's Phase 1: Voice Foundation

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Conversation metadata
  conversation_type TEXT NOT NULL DEFAULT 'planning' CHECK (conversation_type IN ('planning', 'standup', 'quick_capture', 'general')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),

  -- Conversation data
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [{"role": "user|assistant|system", "content": "...", "timestamp": "...", "intent": "...", "actions": [...]}]

  intents JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{"intent": "create_project", "confidence": 0.9, "entities": {...}, "timestamp": "..."}]

  actions_executed JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{"action_id": "...", "type": "create", "entity": "task", "data": {...}, "executed_at": "...", "success": true}]

  -- Context preservation
  context JSONB DEFAULT '{}'::jsonb,
  -- Structure: {"current_project": {...}, "recent_tasks": [...], "user_preferences": {...}}

  -- Quality metrics
  total_turns INTEGER NOT NULL DEFAULT 0,
  avg_confidence DECIMAL(3,2) DEFAULT 0.0,
  successful_actions INTEGER NOT NULL DEFAULT 0,
  failed_actions INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Indexes for performance
  CONSTRAINT valid_confidence CHECK (avg_confidence >= 0 AND avg_confidence <= 1)
);

-- Create indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_organization_id ON conversations(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_conversations_project_id ON conversations(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_type ON conversations(conversation_type);

-- GIN index for JSONB searching
CREATE INDEX idx_conversations_messages_gin ON conversations USING gin(messages);
CREATE INDEX idx_conversations_intents_gin ON conversations USING gin(intents);

-- Voice transcripts table (optional - for audit/analysis)
CREATE TABLE IF NOT EXISTS voice_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Audio metadata
  audio_duration_ms INTEGER,
  audio_size_bytes INTEGER,

  -- Transcription data
  transcript TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  confidence DECIMAL(3,2),

  -- Processing metadata
  transcribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_time_ms INTEGER,
  model_used TEXT DEFAULT 'whisper-1',

  -- Intent parsing results (denormalized for quick access)
  parsed_intent TEXT,
  intent_confidence DECIMAL(3,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_transcript_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT valid_intent_confidence CHECK (intent_confidence >= 0 AND intent_confidence <= 1)
);

-- Indexes for voice_transcripts
CREATE INDEX idx_voice_transcripts_conversation_id ON voice_transcripts(conversation_id);
CREATE INDEX idx_voice_transcripts_user_id ON voice_transcripts(user_id);
CREATE INDEX idx_voice_transcripts_created_at ON voice_transcripts(created_at DESC);
CREATE INDEX idx_voice_transcripts_intent ON voice_transcripts(parsed_intent) WHERE parsed_intent IS NOT NULL;

-- Full-text search on transcripts
CREATE INDEX idx_voice_transcripts_text_search ON voice_transcripts USING gin(to_tsvector('english', transcript));

-- Updated_at trigger for conversations
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_transcripts ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Organization members can view org conversations
CREATE POLICY "Organization members can view org conversations"
  ON conversations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Voice transcripts policies
CREATE POLICY "Users can view their own transcripts"
  ON voice_transcripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transcripts"
  ON voice_transcripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcripts"
  ON voice_transcripts FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE conversations IS 'Multi-turn conversational planning sessions for voice-first project management';
COMMENT ON TABLE voice_transcripts IS 'Voice transcription records for audit trail and analysis';
COMMENT ON COLUMN conversations.messages IS 'Array of conversation messages with role, content, timestamp, and metadata';
COMMENT ON COLUMN conversations.intents IS 'Parsed intents from voice input with confidence scores';
COMMENT ON COLUMN conversations.actions_executed IS 'Actions that were executed as a result of this conversation';
COMMENT ON COLUMN conversations.context IS 'Conversation context including current project, recent tasks, user preferences';
