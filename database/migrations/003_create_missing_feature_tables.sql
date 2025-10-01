-- Migration: Create missing tables for incomplete features
-- Date: 2025-10-01
-- Description: Creates timer_sessions, comment_reactions, and conflict_logs tables

-- Timer Sessions table for time tracking feature
CREATE TABLE IF NOT EXISTS public.timer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for timer_sessions
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_id ON public.timer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_project_id ON public.timer_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_active ON public.timer_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_timer_sessions_start_time ON public.timer_sessions(start_time DESC);

-- Comment Reactions table for reaction feature
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'surprised', 'sad', 'angry', 'thumbs_up', 'thumbs_down', 'celebrate', 'rocket')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Create indexes for comment_reactions
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON public.comment_reactions(reaction_type);

-- Conflict Logs table for conflict resolution tracking
CREATE TABLE IF NOT EXISTS public.conflict_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task', 'milestone', 'comment', 'goal')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('concurrent_update', 'version_mismatch', 'data_inconsistency')),
  local_version JSONB,
  server_version JSONB,
  resolved_version JSONB,
  resolution_strategy TEXT CHECK (resolution_strategy IN ('keep_local', 'keep_server', 'merge', 'manual')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for conflict_logs
CREATE INDEX IF NOT EXISTS idx_conflict_logs_entity ON public.conflict_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_conflict_logs_user_id ON public.conflict_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conflict_logs_created_at ON public.conflict_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conflict_logs_unresolved ON public.conflict_logs(resolved_at) WHERE resolved_at IS NULL;

-- Add comments
COMMENT ON TABLE public.timer_sessions IS 'Time tracking sessions for projects, tasks, and milestones';
COMMENT ON TABLE public.comment_reactions IS 'Emoji reactions to comments';
COMMENT ON TABLE public.conflict_logs IS 'Log of data conflicts and their resolutions';

-- Grant permissions (optional - adjust based on your RLS policy)
-- ALTER TABLE public.timer_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conflict_logs ENABLE ROW LEVEL SECURITY;
