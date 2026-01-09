# Demo Mode Configuration

## Overview
This document configures Foco for comprehensive demo mode testing where all users have full access to all features regardless of role restrictions.

## Demo Mode Features

### Access Control
- All role-based restrictions are disabled
- All users have Owner-level permissions
- No authentication required for demo routes
- Pre-populated sample data available

### Test Users
```javascript
DEMO_USERS = {
  owner: {
    id: 'demo-owner-001',
    email: 'owner@demo.foco.local',
    password: 'DemoOwner123!',
    role: 'owner',
    name: 'Demo Owner'
  },
  manager: {
    id: 'demo-manager-001',
    email: 'manager@demo.foco.local',
    password: 'DemoManager123!',
    role: 'manager',
    name: 'Demo Manager'
  },
  member: {
    id: 'demo-member-001',
    email: 'member@demo.foco.local',
    password: 'DemoMember123!',
    role: 'member',
    name: 'Demo Member'
  },
  viewer: {
    id: 'demo-viewer-001',
    email: 'viewer@demo.foco.local',
    password: 'DemoViewer123!',
    role: 'viewer',
    name: 'Demo Viewer'
  }
}
```

### Sample Data
- 5 Pre-created projects
- 20+ Pre-created tasks with various statuses
- 3 Milestones with tasks
- 2 Goals with key results
- 4 Team members with different roles

### Feature Flags for Demo
```javascript
DEMO_FEATURES = {
  ALLOW_UNRESTRICTED_ACCESS: true,
  SKIP_AUTHENTICATION: false,  // Still require login for security
  BYPASS_ROLE_CHECKS: true,
  ENABLE_SAMPLE_DATA_SEED: true,
  DISABLE_EMAIL_NOTIFICATIONS: true,  // Log to console instead
  ALLOW_DEMO_API_RESET: true,  // Daily reset capability
  ENABLE_VOICE_DEMO: true,  // Voice features unlocked
  UNLIMITED_PROJECTS: true,  // No project limits
  UNLIMITED_STORAGE: true,   // No storage limits
  ENABLE_EXPORT_ALL_FORMATS: true
}
```

### Database Mock Data

#### Organizations
```sql
INSERT INTO organizations (id, name, slug) VALUES
('org-demo-001', 'Demo Organization', 'demo-org'),
('org-demo-002', 'Test Organization', 'test-org');
```

#### Projects
```sql
INSERT INTO projects (id, org_id, name, status, start_date, end_date) VALUES
('proj-demo-001', 'org-demo-001', 'Website Redesign', 'active', '2026-01-01', '2026-03-31'),
('proj-demo-002', 'org-demo-001', 'Mobile App Launch', 'active', '2026-01-15', '2026-04-30'),
('proj-demo-003', 'org-demo-001', 'API Integration', 'planning', '2026-02-01', '2026-05-31'),
('proj-demo-004', 'org-demo-001', 'Performance Optimization', 'active', '2026-01-08', '2026-02-28'),
('proj-demo-005', 'org-demo-001', 'Documentation Update', 'on-hold', '2025-12-01', '2026-02-28');
```

#### Tasks
Sample tasks across different statuses (To Do, In Progress, Review, Done) with various priorities and assignments.

#### Milestones
- Phase 1: Design & Planning (January 2026)
- Phase 2: Development (February - March 2026)
- Phase 3: Testing & Launch (April 2026)

#### Goals
- Website redesign completion (Target: March 31, 2026)
- Mobile app functionality (Target: April 30, 2026)

## Enabling Demo Mode

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_ORG_ID=org-demo-001
DEMO_BYPASS_ROLE_CHECKS=true
DEMO_ENABLE_SAMPLE_DATA=true
DEMO_DISABLE_NOTIFICATIONS=true
```

### Running Demo Mode

1. **Start dev server with demo enabled:**
   ```bash
   NEXT_PUBLIC_DEMO_MODE=true npm run dev
   ```

2. **Login with demo user:**
   - Navigate to http://localhost:3000/auth
   - Use: manager@demo.foco.local / DemoManager123!

3. **Access demo dashboard:**
   - Navigate to http://localhost:3000/demo
   - Full access to all features

### Demo Reset

**Daily Reset Endpoint:**
```bash
curl -X POST http://localhost:3000/api/demo/reset \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json"
```

This resets:
- All task statuses to original
- Clears all test data modifications
- Restores sample data
- Resets team member assignments

## Testing Endpoints

### Demo Mode APIs
```
GET  /api/demo/status          - Check demo mode is enabled
GET  /api/demo/seed            - Seed sample data
POST /api/demo/reset           - Reset to initial state
GET  /api/demo/users           - List demo users
POST /api/demo/login           - Quick login with demo account
```

### Quick Test URLs
```
/demo                           - Demo dashboard (full access)
/projects?demo=true             - Projects with demo data
/tasks?demo=true                - Tasks with demo data
/settings?demo=true             - Settings with full permissions
```

## Feature Testing in Demo Mode

### All Features Available
- ✅ Create/Edit/Delete projects
- ✅ Create/Edit/Delete tasks
- ✅ Create/Edit/Delete milestones
- ✅ Create/Edit/Delete goals
- ✅ Invite team members
- ✅ Change member roles
- ✅ Export projects (all formats)
- ✅ View reports & analytics
- ✅ Access calendar integrations
- ✅ Voice-to-plan feature
- ✅ Real-time collaboration
- ✅ Offline mode
- ✅ Mobile responsive design

### Permissions in Demo Mode
- All users: Owner-level access
- No confirmation dialogs for deletions
- No rate limiting
- No usage quotas

## Testing Strategy

### Parallel Testing
- 10 independent test agents
- Each tests 1-2 user story categories
- Full CRUD operations allowed
- Real-time updates verified
- Mobile responsiveness checked
- Accessibility validated
- Performance benchmarked

### Test Coverage
1. **Authentication & Onboarding** (US-1)
2. **Project Management** (US-2)
3. **Task Management** (US-3)
4. **Milestone Tracking** (US-4)
5. **Goals & Planning** (US-5)
6. **Team & Collaboration** (US-6)
7. **Reporting & Analytics** (US-7)
8. **Integrations & Exports** (US-8)
9. **Mobile Experience** (US-9)
10. **Settings & Preferences** (US-10 & 11)

## Demo Mode Limitations

- **No email sending** (logged to console)
- **No payment processing** (all features free)
- **Limited to demo org** (can't access production data)
- **Data expires daily** (reset at midnight)
- **No persistent storage** (demo data is ephemeral by default)

## Security Notes

⚠️ **Demo Mode is NOT for production!**
- Passwords are stored in plain text in config
- All role checks are bypassed
- Data is public and test-only
- No rate limiting or DDoS protection
- Should only be used locally or on test servers

## Troubleshooting

### Demo mode not enabling
```bash
# Check env vars
echo $NEXT_PUBLIC_DEMO_MODE

# Check logs
tail -f .next/dev.log | grep -i demo
```

### Sample data not loading
```bash
# Manually seed
curl -X POST http://localhost:3000/api/demo/seed
```

### Demo reset failed
```bash
# Clear cache
rm -rf .next
npm run dev
```

---

**Last Updated:** 2026-01-09
**Status:** Ready for comprehensive testing
