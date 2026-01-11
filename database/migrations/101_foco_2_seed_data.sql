-- ============================================================================
-- FOCO 2.0 SEED DATA
-- Migration: 101_foco_2_seed_data.sql
-- Date: 2026-01-10
-- Purpose: Demo workspace with realistic data
-- ============================================================================

BEGIN;

-- ============================================================================
-- CREATE DEMO WORKSPACE
-- ============================================================================
INSERT INTO workspaces (id, name, slug, description, settings, ai_policy)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corp',
  'acme-corp',
  'Demo workspace for Foco 2.0',
  '{
    "density": "comfortable",
    "theme": "system",
    "locale": "en-US"
  }',
  '{
    "allowed_actions": ["suggest", "auto_triage"],
    "auto_apply": false,
    "confidence_threshold": 0.85,
    "data_sources": ["tasks", "comments", "docs", "history"],
    "audit_visible": true
  }'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- CREATE DEMO LABELS (Workspace-level)
-- ============================================================================
INSERT INTO labels (id, workspace_id, name, color, description) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'bug', '#EF4444', 'Bug or defect'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'feature', '#6366F1', 'New feature request'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'improvement', '#8B5CF6', 'Enhancement to existing feature'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'documentation', '#3B82F6', 'Documentation update'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'design', '#EC4899', 'Design work'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'backend', '#10B981', 'Backend development'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'frontend', '#F59E0B', 'Frontend development'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'urgent', '#DC2626', 'Urgent priority'),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'blocked', '#6B7280', 'Blocked by dependency'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'needs-review', '#F97316', 'Needs review')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEMO PROJECTS
-- ============================================================================
INSERT INTO foco_projects (id, workspace_id, name, slug, description, brief, color, icon, status, settings) VALUES
(
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Website Redesign',
  'website-redesign',
  'Complete overhaul of the company website with modern design and improved UX',
  'Launch a new website that improves conversion by 25% and reduces bounce rate by 40%. Key deliverables include new homepage, product pages, and checkout flow.',
  '#6366F1',
  'globe',
  'active',
  '{"statuses": ["backlog", "next", "in_progress", "review", "done"], "wip_limits": {"in_progress": 5, "review": 3}}'
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Mobile App v2',
  'mobile-app-v2',
  'Major version upgrade of the mobile application',
  'Deliver v2 of the mobile app with offline support, push notifications, and improved performance. Target: 4.5+ App Store rating.',
  '#10B981',
  'smartphone',
  'active',
  '{"statuses": ["backlog", "next", "in_progress", "review", "done"], "wip_limits": {"in_progress": 4}}'
),
(
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'API Platform',
  'api-platform',
  'Public API for third-party integrations',
  'Build and launch public API with OAuth2, rate limiting, and comprehensive documentation. Enable 10 launch partners.',
  '#F59E0B',
  'code',
  'active',
  '{"statuses": ["backlog", "next", "in_progress", "review", "done"]}'
),
(
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Q1 Marketing Campaign',
  'q1-marketing',
  'Q1 2026 integrated marketing campaign',
  'Execute multi-channel marketing campaign targeting 50K new signups and 20% increase in brand awareness.',
  '#EC4899',
  'megaphone',
  'active',
  '{"statuses": ["backlog", "next", "in_progress", "review", "done"]}'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEMO WORK ITEMS - Website Redesign Project
-- ============================================================================
INSERT INTO work_items (id, workspace_id, project_id, type, title, description, status, priority, due_date, estimate_hours, position) VALUES
-- Milestone
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'milestone', 'Design Phase Complete', 'All design mockups approved and ready for development', 'in_progress', 'high', '2026-01-20', NULL, 0),

-- Tasks
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'task', 'Create homepage wireframes', 'Design low-fidelity wireframes for the new homepage layout', 'done', 'high', '2026-01-10', 8, 1),

('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'task', 'Design homepage mockups', 'High-fidelity mockups with final colors, typography, and imagery', 'in_progress', 'high', '2026-01-15', 16, 2),

('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'task', 'Product page templates', 'Design reusable templates for product detail pages', 'next', 'medium', '2026-01-18', 12, 3),

('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'task', 'Checkout flow redesign', 'Simplify checkout to 3 steps max with guest checkout option', 'next', 'high', '2026-01-22', 20, 4),

('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'task', 'Mobile responsive audit', 'Review all pages for mobile responsiveness', 'backlog', 'medium', '2026-01-25', 8, 5),

('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'feature', 'Add dark mode support', 'Implement system-aware dark mode across all pages', 'backlog', 'low', '2026-02-01', 24, 6),

('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'bug', 'Fix navigation dropdown on Safari', 'Navigation dropdown not closing properly on Safari 17+', 'review', 'urgent', '2026-01-12', 4, 7),

('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'task', 'SEO optimization audit', 'Review meta tags, structured data, and Core Web Vitals', 'blocked', 'medium', '2026-01-28', 12, 8),

('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 
 'task', 'Content migration plan', 'Document migration strategy for 500+ product pages', 'done', 'high', '2026-01-08', 6, 9)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEMO WORK ITEMS - Mobile App v2 Project
-- ============================================================================
INSERT INTO work_items (id, workspace_id, project_id, type, title, description, status, priority, due_date, estimate_hours, position) VALUES
('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 
 'milestone', 'Beta Release', 'Internal beta release for testing', 'next', 'high', '2026-02-01', NULL, 0),

('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 
 'feature', 'Offline mode implementation', 'Allow users to access cached data without internet', 'in_progress', 'high', '2026-01-25', 40, 1),

('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 
 'feature', 'Push notification system', 'Implement FCM/APNs for real-time notifications', 'next', 'high', '2026-01-28', 32, 2),

('30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 
 'task', 'Performance optimization', 'Reduce app launch time to under 2 seconds', 'in_progress', 'medium', '2026-01-20', 24, 3),

('30000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 
 'bug', 'Memory leak in image gallery', 'App crashes after viewing 50+ images in gallery', 'review', 'urgent', '2026-01-14', 8, 4),

('30000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 
 'task', 'Update to latest SDK versions', 'Upgrade React Native and dependencies', 'done', 'medium', '2026-01-10', 16, 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEMO WORK ITEMS - API Platform Project
-- ============================================================================
INSERT INTO work_items (id, workspace_id, project_id, type, title, description, status, priority, due_date, estimate_hours, position) VALUES
('30000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 
 'milestone', 'API v1 Launch', 'Public launch of API v1', 'backlog', 'high', '2026-03-01', NULL, 0),

('30000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 
 'task', 'OAuth2 implementation', 'Implement OAuth2 with PKCE flow', 'in_progress', 'high', '2026-01-30', 32, 1),

('30000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 
 'task', 'Rate limiting service', 'Build rate limiting with Redis and configurable tiers', 'next', 'high', '2026-02-05', 24, 2),

('30000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 
 'task', 'API documentation', 'OpenAPI 3.0 spec with interactive documentation', 'next', 'medium', '2026-02-10', 40, 3),

('30000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 
 'feature', 'Webhook system', 'Allow partners to receive real-time event webhooks', 'backlog', 'medium', '2026-02-20', 48, 4)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ADD BLOCKED REASON
-- ============================================================================
UPDATE work_items 
SET blocked_reason = 'Waiting for design mockups to be finalized'
WHERE id = '30000000-0000-0000-0000-000000000009';

-- ============================================================================
-- CREATE DEMO DOCS
-- ============================================================================
INSERT INTO docs (id, workspace_id, project_id, title, content, content_type, template) VALUES
(
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Website Redesign PRD',
  '# Website Redesign PRD

## Overview
Complete overhaul of the company website with modern design and improved UX.

## Goals
- Improve conversion rate by 25%
- Reduce bounce rate by 40%
- Achieve 90+ Lighthouse score

## Key Features
1. **New Homepage** - Hero section, featured products, testimonials
2. **Product Pages** - Improved imagery, reviews, recommendations
3. **Checkout Flow** - 3-step checkout, guest checkout, Apple/Google Pay

## Timeline
- Design Phase: Jan 1-20
- Development Phase: Jan 21 - Feb 28
- Testing: Mar 1-15
- Launch: Mar 20

## Success Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Conversion Rate | 2.1% | 2.6% |
| Bounce Rate | 58% | 35% |
| Page Load Time | 3.2s | 1.5s |',
  'markdown',
  'PRD'
),
(
  '40000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Design System Guidelines',
  '# Design System Guidelines

## Typography
- **Headings**: Inter, 600 weight
- **Body**: Inter, 400 weight
- **Code**: JetBrains Mono

## Colors
### Primary
- Brand: #6366F1 (Indigo)
- Hover: #4F46E5

### Semantic
- Success: #22C55E
- Warning: #EAB308
- Error: #EF4444
- Info: #3B82F6

## Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## Components
See Figma library for full component documentation.',
  'markdown',
  NULL
),
(
  '40000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'Mobile App v2 Technical Spec',
  '# Mobile App v2 Technical Specification

## Architecture
- React Native 0.73+
- Redux Toolkit for state
- React Query for server state
- SQLite for offline storage

## Offline Mode
### Data Sync Strategy
1. Background sync every 5 minutes when online
2. Queue mutations when offline
3. Conflict resolution: server wins with user notification

### Cached Data
- User profile
- Last 100 items from each list
- Favorited content

## Push Notifications
- FCM for Android
- APNs for iOS
- Topics: orders, promotions, system

## Performance Targets
- Cold start: < 2s
- Time to interactive: < 1s
- Memory: < 200MB',
  'markdown',
  NULL
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEMO SAVED VIEWS
-- ============================================================================
INSERT INTO saved_views (id, workspace_id, project_id, name, view_type, filters, sort_by, is_default, is_shared) VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'My Tasks',
  'list',
  '{"assignee": "me"}',
  'due_date',
  false,
  false
),
(
  '50000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'High Priority',
  'list',
  '{"priority": ["urgent", "high"]}',
  'priority',
  false,
  true
),
(
  '50000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Due This Week',
  'list',
  '{"due_date": "this_week"}',
  'due_date',
  false,
  true
),
(
  '50000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Blocked Items',
  'list',
  '{"status": "blocked"}',
  'updated_at',
  false,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEMO AUTOMATIONS
-- ============================================================================
INSERT INTO automations (id, workspace_id, name, description, is_active, trigger_type, trigger_config, conditions, action_type, action_config) VALUES
(
  '60000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Notify on blocked',
  'When a task is marked blocked, notify the assignee and project owner',
  true,
  'status_changed',
  '{"to_status": "blocked"}',
  '[]',
  'notify',
  '{"recipients": ["assignee", "project_owner"], "message": "Task {{title}} is now blocked: {{blocked_reason}}"}'
),
(
  '60000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Auto-assign bugs',
  'Automatically assign bugs to the on-call engineer',
  true,
  'work_item_created',
  '{"type": "bug"}',
  '[{"field": "priority", "operator": "in", "value": ["urgent", "high"]}]',
  'assign',
  '{"to": "oncall_rotation"}'
),
(
  '60000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Weekly status report',
  'Generate and send weekly project status every Monday at 9am',
  true,
  'schedule',
  '{"cron": "0 9 * * 1"}',
  '[]',
  'generate_report',
  '{"type": "weekly_status", "send_to": ["project_owner", "workspace_admins"]}'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- END OF FOCO 2.0 SEED DATA
-- ============================================================================
