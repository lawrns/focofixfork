-- ============================================================================
-- PROJECT TEMPLATES SEED DATA
-- Seeds: 107_seed_project_templates.sql
-- Date: 2026-01-12
-- Purpose: Insert pre-built project templates for users
-- ============================================================================

-- Get system user for template creation (or use first admin user)
DO $$
DECLARE
  system_user_id UUID;
BEGIN
  -- Try to get a system admin user or use the first user
  SELECT id INTO system_user_id FROM auth.users LIMIT 1;

  IF system_user_id IS NOT NULL THEN
    -- Get a workspace ID for the templates
    INSERT INTO project_templates (
      user_id,
      workspace_id,
      name,
      description,
      structure,
      is_public,
      created_by,
      created_at,
      updated_at
    ) VALUES
    -- Product Launch Template
    (
      system_user_id,
      (SELECT workspace_id FROM user_profiles LIMIT 1),
      'Product Launch',
      'Structured workflow for launching a product',
      '{
        "defaultTasks": [
          {
            "title": "Research & Strategy",
            "description": "Market research and product strategy",
            "priority": "high"
          },
          {
            "title": "Development",
            "description": "Build product MVP",
            "priority": "high"
          },
          {
            "title": "Testing & QA",
            "description": "Quality assurance and testing",
            "priority": "high"
          },
          {
            "title": "Marketing Prep",
            "description": "Prepare marketing materials",
            "priority": "medium"
          },
          {
            "title": "Launch",
            "description": "Product launch day",
            "priority": "high"
          }
        ],
        "customFields": [
          {"name": "Target Market", "type": "text"},
          {"name": "Launch Date", "type": "date"},
          {"name": "Budget", "type": "number"}
        ]
      }'::jsonb,
      true,
      system_user_id,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ),
    -- Marketing Campaign Template
    (
      system_user_id,
      (SELECT workspace_id FROM user_profiles LIMIT 1),
      'Marketing Campaign',
      'Plan and execute a marketing campaign',
      '{
        "defaultTasks": [
          {
            "title": "Define Campaign Goals",
            "description": "Set SMART goals",
            "priority": "high"
          },
          {
            "title": "Audience Research",
            "description": "Identify target audience",
            "priority": "high"
          },
          {
            "title": "Content Creation",
            "description": "Create marketing content",
            "priority": "high"
          },
          {
            "title": "Channel Setup",
            "description": "Configure marketing channels",
            "priority": "medium"
          },
          {
            "title": "Campaign Launch",
            "description": "Go live with campaign",
            "priority": "high"
          },
          {
            "title": "Monitor & Optimize",
            "description": "Track metrics and optimize",
            "priority": "medium"
          }
        ],
        "customFields": [
          {"name": "Campaign Name", "type": "text"},
          {"name": "Budget", "type": "number"},
          {"name": "Target ROI %", "type": "number"}
        ]
      }'::jsonb,
      true,
      system_user_id,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ),
    -- Software Development Template
    (
      system_user_id,
      (SELECT workspace_id FROM user_profiles LIMIT 1),
      'Software Development',
      'Structure for software development projects',
      '{
        "defaultTasks": [
          {
            "title": "Requirements & Analysis",
            "description": "Gather and document requirements",
            "priority": "high"
          },
          {
            "title": "Design",
            "description": "System design and architecture",
            "priority": "high"
          },
          {
            "title": "Implementation",
            "description": "Write and implement code",
            "priority": "high"
          },
          {
            "title": "Code Review",
            "description": "Peer code review and QA",
            "priority": "high"
          },
          {
            "title": "Testing",
            "description": "Unit and integration testing",
            "priority": "high"
          },
          {
            "title": "Deployment",
            "description": "Deploy to production",
            "priority": "high"
          },
          {
            "title": "Monitoring",
            "description": "Monitor and support post-launch",
            "priority": "medium"
          }
        ],
        "customFields": [
          {"name": "Repository URL", "type": "text"},
          {"name": "Tech Stack", "type": "text"},
          {"name": "Development Team Size", "type": "number"}
        ]
      }'::jsonb,
      true,
      system_user_id,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

  END IF;
END $$;
