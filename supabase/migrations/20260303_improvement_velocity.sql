-- Add autonomous improvement tracking to project health
ALTER TABLE crico_project_health
  ADD COLUMN IF NOT EXISTS autonomous_improvements_week int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS autonomous_improvements_month int DEFAULT 0;
