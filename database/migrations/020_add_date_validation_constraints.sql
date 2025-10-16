-- Migration: Add date validation constraints
-- Date: 2025-10-16
-- Description: Adds CHECK constraints to ensure date integrity across tables

-- STEP 1: Fix existing invalid data BEFORE applying constraints
-- Update projects where due_date < start_date
UPDATE projects
SET due_date = start_date + INTERVAL '30 days'
WHERE start_date IS NOT NULL
  AND due_date IS NOT NULL
  AND due_date < start_date;

-- Milestones don't have start_date, skip this update

-- Update tasks where due_date < created_at
UPDATE tasks
SET due_date = (created_at + INTERVAL '7 days')::date
WHERE due_date IS NOT NULL
  AND created_at IS NOT NULL
  AND due_date < created_at::date;

-- STEP 2: Now add the constraints (data is clean)
-- Projects table: due_date must be after start_date
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_date_order_check;

ALTER TABLE projects
ADD CONSTRAINT projects_date_order_check
CHECK (
  (start_date IS NULL OR due_date IS NULL) OR
  (due_date >= start_date)
);

-- Milestones: No start_date column, skip date order constraint

-- Tasks table: due_date must be after created_at
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_due_date_check;

ALTER TABLE tasks
ADD CONSTRAINT tasks_due_date_check
CHECK (
  due_date IS NULL OR
  due_date >= created_at::date
);
