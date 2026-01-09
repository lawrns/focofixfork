# Foco - User Stories & Testing Scenarios

## Overview
This document contains comprehensive user stories for the Foco voice-powered project management system. Each story includes acceptance criteria and test scenarios for demo mode validation.

---

## 1. Authentication & Onboarding

### US-1.1: User Registration
**As a** new user
**I want to** create an account with email and password
**So that** I can access Foco and manage my projects

**Acceptance Criteria:**
- User can register with valid email and password
- System validates email format
- System enforces password strength requirements (min 8 chars, mixed case, numbers)
- User receives confirmation email
- User can log in after registration

**Test Scenarios (Demo Mode):**
- Register with valid email and password
- Attempt registration with invalid email format
- Attempt registration with weak password
- Verify confirmation email is sent
- Login with newly created credentials

---

### US-1.2: Social Authentication
**As a** user
**I want to** register/login using Google or GitHub
**So that** I can quickly access Foco without managing passwords

**Acceptance Criteria:**
- User can login with Google OAuth
- User can login with GitHub OAuth
- Social login creates account on first use
- Existing users can link social accounts

**Test Scenarios (Demo Mode):**
- Login with Google account
- Login with GitHub account
- Link social account to existing email account
- Verify user data is correctly mapped

---

### US-1.3: Organization Creation
**As a** newly registered user
**I want to** create my first organization
**So that** I can start managing projects with my team

**Acceptance Criteria:**
- User can create organization with name and optional description
- User becomes organization owner
- Organization is immediately usable
- User can invite team members

**Test Scenarios (Demo Mode):**
- Create organization with valid name
- Verify user is set as owner
- Create organization with description
- Navigate to organization dashboard
- Access organization settings

---

## 2. Project Management

### US-2.1: Create Project
**As a** project manager
**I want to** create a new project with title, description, and team members
**So that** I can organize and track work for a specific initiative

**Acceptance Criteria:**
- User can create project with title and description
- User can assign team members to project
- User can set project status (Planning, Active, On Hold, Completed)
- Project appears in dashboard immediately
- User can set project timeline (start/end dates)

**Test Scenarios (Demo Mode):**
- Create project with title and description
- Create project without description
- Add multiple team members during creation
- Set project status to "Active"
- Set project timeline
- Verify project appears in dashboard

---

### US-2.2: View Project Dashboard
**As a** team member
**I want to** see an overview of all projects in my organization
**So that** I can understand current work and priorities

**Acceptance Criteria:**
- Dashboard shows all projects accessible to user
- Projects display: title, status, progress, team members
- User can filter projects by status
- User can sort projects by various fields
- Dashboard updates in real-time

**Test Scenarios (Demo Mode):**
- View all projects in organization
- Filter by status (Active, Planning, etc.)
- Sort by name, date, progress
- Verify real-time updates when project changes
- View project count and statistics

---

### US-2.3: Update Project
**As a** project manager
**I want to** edit project details, team members, and settings
**So that** I can keep project information current

**Acceptance Criteria:**
- User can update project title and description
- User can add/remove team members
- User can change project status
- User can update timeline
- Changes are reflected immediately

**Test Scenarios (Demo Mode):**
- Edit project title and description
- Add new team member
- Remove team member
- Change project status
- Update project timeline
- Verify changes are saved

---

### US-2.4: Delete Project
**As a** project manager
**I want to** archive or delete completed/inactive projects
**So that** I can keep the dashboard focused on active work

**Acceptance Criteria:**
- User can archive project (soft delete)
- User can permanently delete project (with confirmation)
- Archived projects can be restored
- Project deletion logs are maintained
- Only owners/managers can delete projects

**Test Scenarios (Demo Mode):**
- Archive a project
- View archived projects
- Restore archived project
- Attempt to permanently delete project
- Verify confirmation dialog appears
- Verify deletion prevents unauthorized access

---

## 3. Task Management

### US-3.1: Create Task
**As a** project manager
**I want to** create tasks within a project
**So that** I can break down work into manageable pieces

**Acceptance Criteria:**
- User can create task with title, description, assignee
- User can set task priority (Low, Medium, High, Critical)
- User can set due date
- User can set estimated effort
- User can create subtasks
- Tasks appear in project immediately

**Test Scenarios (Demo Mode):**
- Create task with title and description
- Create task and assign to team member
- Set priority and due date
- Create subtask
- Set estimated effort
- Verify task appears in project task list

---

### US-3.2: Update Task Status
**As a** team member
**I want to** change task status to track progress
**So that** everyone knows what I'm working on

**Acceptance Criteria:**
- User can change task status (To Do, In Progress, Review, Done)
- Status changes trigger notifications to assignees
- Status change history is maintained
- Drag-and-drop status updates in kanban view
- Progress updates reflect in project completion percentage

**Test Scenarios (Demo Mode):**
- Change task status via dropdown
- Use kanban drag-and-drop to change status
- Move task through complete workflow (To Do → Done)
- Verify notifications sent to watchers
- Check project progress updated

---

### US-3.3: Task Assignment & Collaboration
**As a** task owner
**I want to** assign tasks to team members and track progress
**So that** work is distributed fairly and transparently

**Acceptance Criteria:**
- User can assign task to single/multiple members
- User can add watchers to task
- User can add comments and attachments
- Task shows activity timeline
- Assignees receive notifications

**Test Scenarios (Demo Mode):**
- Assign task to team member
- Assign task to multiple members
- Add watcher to task
- Post comment on task
- Upload file attachment
- Verify activity feed shows all changes

---

### US-3.4: Task Search & Filter
**As a** team member
**I want to** search and filter tasks efficiently
**So that** I can find relevant work quickly

**Acceptance Criteria:**
- User can search tasks by title/description
- User can filter by assignee, priority, status, due date
- User can save filter views
- Search is real-time and responsive
- Results show relevant metadata

**Test Scenarios (Demo Mode):**
- Search for task by keyword
- Filter by assignee
- Filter by priority
- Filter by status
- Combine multiple filters
- Save and reload filter view

---

## 4. Milestone Tracking

### US-4.1: Create Milestone
**As a** project manager
**I want to** create milestones to track major project phases
**So that** I can manage dependencies and communicate progress

**Acceptance Criteria:**
- User can create milestone with name and date
- User can associate tasks with milestone
- User can set milestone status (Not Started, In Progress, At Risk, Completed)
- Milestone shows task completion percentage
- Milestones appear on project timeline

**Test Scenarios (Demo Mode):**
- Create milestone with name and date
- Add tasks to milestone
- View milestone details
- Check task completion percentage
- Change milestone status
- View milestone on project timeline

---

### US-4.2: Milestone Timeline View
**As a** stakeholder
**I want to** see all milestones on an interactive timeline
**So that** I can understand project phases and dependencies

**Acceptance Criteria:**
- Timeline displays all milestones chronologically
- Milestones show estimated vs actual dates
- User can drag milestones to adjust dates
- Timeline shows task bars and dependencies
- Timeline is interactive and zoomable

**Test Scenarios (Demo Mode):**
- View timeline with multiple milestones
- Drag milestone to change date
- View tasks within milestone bar
- Check dependency visualization
- Zoom in/out on timeline

---

## 5. Goals & Planning

### US-5.1: Create Goal
**As a** project manager
**I want to** create goals for projects
**So that** I can track strategic objectives

**Acceptance Criteria:**
- User can create goal with name and description
- User can set goal target date
- User can link goals to projects
- Goal shows progress percentage
- User can add key results to goals

**Test Scenarios (Demo Mode):**
- Create goal with name and description
- Set goal target date
- Link goal to project
- Create key results for goal
- View goal progress
- Update goal status

---

### US-5.2: Voice-to-Plan Workflow
**As a** project manager
**I want to** speak my project idea and have AI create a plan
**So that** I can transform ideas to executable plans quickly

**Acceptance Criteria:**
- User can record voice input
- AI transcribes voice to text
- AI generates project structure from voice input
- Generated plan shows tasks, timeline, team assignments
- User can edit AI-generated plan before confirming
- Generated plan creates actual project/tasks

**Test Scenarios (Demo Mode - Voice/Demo)**
- Record voice describing project
- Verify transcription accuracy
- Review AI-generated project structure
- Edit generated tasks and timeline
- Confirm and create actual project
- Verify all tasks and timelines created

---

## 6. Team & Collaboration

### US-6.1: Team Member Invitation
**As a** organization owner
**I want to** invite team members to my organization
**So that** my team can collaborate on projects

**Acceptance Criteria:**
- User can send invitation via email
- User can set role for invited member (Owner, Manager, Member, Viewer)
- Invited members receive email with join link
- Invitation can be resended or revoked
- Members can accept/decline invitation

**Test Scenarios (Demo Mode):**
- Send invitation to new member
- Set member role
- Resend invitation
- Verify invitation email sent
- Accept invitation as new user
- View member in organization

---

### US-6.2: Role-Based Access Control
**As a** organization owner
**I want to** control what team members can do based on their role
**So that** sensitive operations are properly restricted

**Acceptance Criteria:**
- Owner can delete projects/organization
- Manager can create/edit projects
- Member can view and edit assigned tasks
- Viewer can view-only
- Role restrictions are enforced
- Attempt to access restricted actions is prevented

**Test Scenarios (Demo Mode):**
- Test Owner permissions (create, edit, delete, invite)
- Test Manager permissions (create, edit, no delete)
- Test Member permissions (edit own tasks)
- Test Viewer permissions (view only)
- Attempt unauthorized action (should fail gracefully)

---

### US-6.3: Activity Log & Notifications
**As a** team member
**I want to** receive notifications and see activity history
**So that** I stay informed about project changes

**Acceptance Criteria:**
- User receives notifications for: assigned tasks, mentions, milestone changes
- User can configure notification preferences
- Activity log shows all project changes with timestamps
- Notifications can be via: in-app, email, push
- User can view notification history

**Test Scenarios (Demo Mode):**
- Get assigned to task (notification sent)
- Be mentioned in comment (notification sent)
- View notification in notification center
- Change notification preferences
- View activity log
- Check email notification received

---

## 7. Reporting & Analytics

### US-7.1: Project Dashboard
**As a** stakeholder
**I want to** see project KPIs and metrics
**So that** I can understand project health and progress

**Acceptance Criteria:**
- Dashboard shows project completion percentage
- Dashboard shows task distribution by status
- Dashboard shows team workload distribution
- Dashboard shows timeline health (on-track vs at-risk)
- Metrics update in real-time

**Test Scenarios (Demo Mode):**
- View project dashboard
- Check completion percentage
- View task status distribution
- View team workload
- Check timeline status
- Verify real-time updates

---

### US-7.2: Team Performance Report
**As a** manager
**I want to** see individual and team performance metrics
**So that** I can identify bottlenecks and celebrate wins

**Acceptance Criteria:**
- Report shows tasks completed per team member
- Report shows average task completion time
- Report shows on-time delivery percentage
- Report shows quality metrics
- Report can be exported as PDF

**Test Scenarios (Demo Mode):**
- Generate team performance report
- View individual contributor metrics
- View team averages
- Check on-time delivery stats
- Export report as PDF
- View metrics over time period

---

### US-7.3: Burndown Chart
**As a** scrum master
**I want to** see burndown/burnup charts
**So that** I can track sprint progress

**Acceptance Criteria:**
- Chart shows planned vs actual work
- Chart updates as tasks are completed
- User can view by sprint or custom period
- Chart shows velocity trend
- Ideal line is displayed for reference

**Test Scenarios (Demo Mode):**
- View burndown chart for current sprint
- Complete tasks and verify chart updates
- View burnup chart alternative
- Check velocity metrics
- View historical burndown trends

---

## 8. Integrations & Exports

### US-8.1: Export Project Data
**As a** user
**I want to** export project data in multiple formats
**So that** I can use the data in other tools

**Acceptance Criteria:**
- User can export as CSV
- User can export as JSON
- User can export as PDF report
- User can export as Excel spreadsheet
- Export includes tasks, milestones, team info

**Test Scenarios (Demo Mode):**
- Export project as CSV
- Export project as JSON
- Export as PDF report
- Export as Excel
- Verify data integrity in exported file
- Re-import exported data (if applicable)

---

### US-8.2: Calendar Integration
**As a** team member
**I want to** see tasks and milestones in my calendar
**So that** I can plan my time effectively

**Acceptance Criteria:**
- User can view tasks/milestones in calendar view
- User can sync to Google Calendar
- User can sync to Outlook Calendar
- Calendar shows due dates and milestones
- Changes in Foco sync to calendar

**Test Scenarios (Demo Mode):**
- View calendar with tasks and milestones
- Check due date accuracy
- Sync to Google Calendar
- Sync to Outlook Calendar
- Verify bi-directional sync works

---

## 9. Mobile Experience

### US-9.1: Mobile Project Viewing
**As a** mobile user
**I want to** view and update my projects on my phone
**So that** I can stay productive while on the go

**Acceptance Criteria:**
- Mobile layout is responsive and optimized
- User can view project list on mobile
- User can update task status on mobile
- User can view task details on mobile
- Touch interactions are intuitive

**Test Scenarios (Demo Mode):**
- View projects on mobile device
- View project tasks
- Update task status with touch
- Add comment to task
- Create new task on mobile
- Check responsive layout

---

### US-9.2: Offline Support
**As a** mobile user
**I want to** work offline and sync when back online
**So that** I don't lose productivity without internet

**Acceptance Criteria:**
- User can view cached project data offline
- User can update tasks offline
- Changes sync when online
- Sync conflicts are handled gracefully
- Offline indicator is shown

**Test Scenarios (Demo Mode):**
- Go offline (disable network)
- View cached projects
- Update task (offline)
- Go online
- Verify sync completes
- Check for conflicts

---

## 10. Settings & Preferences

### US-10.1: User Profile Settings
**As a** user
**I want to** manage my profile information and preferences
**So that** my account reflects my identity and preferences

**Acceptance Criteria:**
- User can update name, email, avatar
- User can change password
- User can enable two-factor authentication
- User can manage connected accounts
- Changes are saved immediately

**Test Scenarios (Demo Mode):**
- Update profile name and avatar
- Change password
- Enable 2FA
- Connect social account
- Update email preferences
- Verify changes saved

---

### US-10.2: Notification Preferences
**As a** user
**I want to** control which notifications I receive and how
**So that** I'm not overwhelmed but stay informed

**Acceptance Criteria:**
- User can enable/disable notification types
- User can set quiet hours (do not disturb)
- User can choose notification channels (email, push, in-app)
- User can set digest frequency
- Preferences are saved immediately

**Test Scenarios (Demo Mode):**
- Toggle notification types on/off
- Set quiet hours (9 PM - 9 AM)
- Choose notification channels
- Set digest to daily/weekly
- Test notification delivery respects settings

---

### US-10.3: Organization Settings
**As a** organization owner
**I want to** manage organization-wide settings
**So that** I can enforce policies and configure the workspace

**Acceptance Criteria:**
- Owner can manage organization name/logo
- Owner can set default project template
- Owner can configure authentication methods
- Owner can manage billing
- Owner can view organization audit log

**Test Scenarios (Demo Mode):**
- Update organization name and logo
- Set default project template
- View audit log
- View member list and permissions
- Check billing information
- Configure email domain restrictions

---

## 11. Security & Privacy

### US-11.1: Data Encryption
**As a** security-conscious user
**I want to** know my data is encrypted
**So that** I can trust Foco with sensitive information

**Acceptance Criteria:**
- All data in transit uses HTTPS/TLS
- Sensitive data is encrypted at rest
- Password is hashed with strong algorithm
- User can verify encryption status

**Test Scenarios (Demo Mode):**
- Verify HTTPS connection (check URL)
- Check certificate validity
- Verify sensitive data is masked in logs
- Test password hashing (in database)
- Verify authentication tokens are secure

---

### US-11.2: Data Privacy & GDPR
**As a** user
**I want to** control my data and have privacy rights
**So that** I can comply with privacy regulations

**Acceptance Criteria:**
- User can request data export
- User can request data deletion
- User can manage third-party access
- Privacy policy is accessible
- Terms of service are available

**Test Scenarios (Demo Mode):**
- Request personal data export
- View exported data format
- Request account deletion (with confirmation)
- Review privacy policy
- Review terms of service
- Manage connected apps/integrations

---

## 12. Accessibility

### US-12.1: Keyboard Navigation
**As a** keyboard user
**I want to** navigate Foco using only keyboard
**So that** I can use the application efficiently

**Acceptance Criteria:**
- All features are keyboard accessible
- Focus indicators are visible
- Keyboard shortcuts are provided
- Tab order is logical
- Escape key closes dialogs

**Test Scenarios (Demo Mode):**
- Navigate using Tab key
- Open dropdown with keyboard
- Submit form with Enter key
- Close dialog with Escape
- Use keyboard shortcuts (Cmd+S, etc.)
- Verify focus is visible on all elements

---

### US-12.2: Screen Reader Support
**As a** screen reader user
**I want to** use Foco with a screen reader
**So that** I can access all features equally

**Acceptance Criteria:**
- All content is announced by screen reader
- Form labels are properly associated
- Buttons have accessible labels
- Images have alt text
- Landmarks are properly defined

**Test Scenarios (Demo Mode):**
- Test with NVDA or JAWS
- Verify all text is announced
- Check form labels
- Verify link purposes are clear
- Check heading structure
- Verify focus management

---

## 13. Performance

### US-13.1: Fast Page Load
**As a** user
**I want to** have pages load quickly
**So that** I don't waste time waiting

**Acceptance Criteria:**
- Page load time < 2 seconds
- Time to interactive < 3 seconds
- Lighthouse performance score > 90
- Images are lazy loaded
- Code is minified and split

**Test Scenarios (Demo Mode):**
- Measure page load time
- Check Core Web Vitals
- Run Lighthouse audit
- Verify images load on demand
- Check bundle size
- Test on slow network (3G)

---

### US-13.2: Smooth Animations
**As a** user
**I want to** experience smooth animations
**So that** the app feels polished and responsive

**Acceptance Criteria:**
- Animations run at 60 FPS
- No jank or stuttering
- Animations respect prefers-reduced-motion
- Loading states are shown
- Transitions are smooth

**Test Scenarios (Demo Mode):**
- Check animation frame rates
- Drag and drop tasks (should be smooth)
- Open/close modals
- Scroll through lists
- Check reduced motion preference works

---

## Testing Checklist

### Demo Mode Test Execution
- [ ] All 13 user story categories tested
- [ ] Happy path scenarios passing
- [ ] Error cases handled gracefully
- [ ] Permissions enforced correctly
- [ ] Real-time updates working
- [ ] Mobile responsive
- [ ] Accessibility requirements met
- [ ] Performance targets achieved
- [ ] Data integrity verified
- [ ] All integrations functional

---

## Demo Mode Access

When testing these user stories, use the following demo credentials:

```
Organization Owner:
- Email: owner@demo.foco.local
- Password: DemoOwner123!

Project Manager:
- Email: manager@demo.foco.local
- Password: DemoManager123!

Team Member:
- Email: member@demo.foco.local
- Password: DemoMember123!

Viewer:
- Email: viewer@demo.foco.local
- Password: DemoViewer123!
```

**Demo Mode Features:**
- Full read/write access (all CRUD operations)
- All features unlocked
- Unlimited projects, tasks, milestones
- Real-time collaboration enabled
- Email notifications disabled (logged to console)
- No payment required
- Sample data pre-populated
- Reset available daily

---

## Success Criteria

All user stories are considered successful when:
1. ✅ Feature is implemented and functional
2. ✅ All acceptance criteria met
3. ✅ Test scenarios pass in demo mode
4. ✅ No console errors or warnings
5. ✅ Performance benchmarks met
6. ✅ Accessibility standards met
7. ✅ Mobile responsive
8. ✅ Real-time updates working
9. ✅ Data persists correctly
10. ✅ Error messages are helpful

---

**Last Updated:** 2026-01-09
**Version:** 1.0
**Maintainers:** Foco Team
