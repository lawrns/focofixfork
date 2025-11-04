-- Database Schema Diff: Current vs Target for Voice Planning
-- Run this to understand current state

SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('projects', 'milestones', 'tasks', 'plan_sessions', 'voice_intents', 'ai_suggestions', 'task_dependencies')
ORDER BY table_name, ordinal_position;
