# Foco Simple Mode - Frequently Asked Questions

## Table of Contents

1. [General Questions](#general-questions)
2. [Data & Export Questions](#data--export-questions)
3. [Feature-Specific Questions](#feature-specific-questions)
4. [Technical Questions](#technical-questions)
5. [Team & Collaboration Questions](#team--collaboration-questions)
6. [Billing & Account Questions](#billing--account-questions)
7. [Troubleshooting Questions](#troubleshooting-questions)

---

## General Questions

### 1. What is Simple Mode?

Simple Mode is Foco's streamlined experience that removes complexity and helps you focus on what matters. We've replaced 8 complex features with AI-powered workflows that are faster, cleaner, and more intuitive.

**What's changing:**
- Manual configurations → AI automation
- Multiple views → Focused core views
- Complex forms → Natural language input
- Feature bloat → Essential tools only

**The result:** 3x faster task creation, 60% less time in settings, and clearer focus on getting things done.

---

### 2. Why are you making these changes?

After analyzing how thousands of teams use Foco, we discovered that **the most productive teams use the simplest features**.

**Key findings:**
- 85% of users never customize Kanban boards
- 72% of custom fields are never filled out
- 68% of teams don't use time tracking
- Advanced features slow down 90% of users

We're focusing on what actually helps teams ship work, not just configure tools.

**Philosophy shift:** From "feature completeness" to "focused productivity"

---

### 3. When does Simple Mode launch?

**Timeline:**

| Date | Event |
|------|-------|
| **February 1, 2026** | Announcement + beta access |
| **February 15, 2026** | Export reminder email |
| **February 28, 2026** | Final export deadline |
| **March 1, 2026** | Simple Mode launches (deprecated features removed) |

**What you should do:**
- Export any data you want to preserve before Feb 28
- Try Simple Mode beta (Settings > Beta Features)
- Review the migration guide

---

### 4. Will I lose any data?

**No.** All your tasks, projects, milestones, comments, team members, and activity history are preserved.

**What's preserved:**
- ✅ All tasks and subtasks
- ✅ Projects and milestones
- ✅ Comments and mentions
- ✅ Team members and permissions
- ✅ Task history and activity log
- ✅ Attachments (as links)

**What's removed:**
- ❌ Custom field configurations (export available)
- ❌ Advanced filter definitions (export available)
- ❌ Gantt chart layouts (data preserved in tasks)
- ❌ Time tracking logs (export available)
- ❌ Multiple Kanban customizations

**Bottom line:** Your work is safe. Configuration complexity is removed.

---

### 5. Can I keep using the old features?

Until March 1, yes. After March 1, no.

**Before March 1:**
- All current features remain available
- You can enable Simple Mode beta to preview
- Switch back and forth freely

**After March 1:**
- Deprecated features are removed
- Simple Mode becomes the only experience
- Export options for deprecated features close

**Why we can't maintain both:**
- Maintaining two experiences doubles development cost
- Creates confusion within teams
- Slows down innovation
- Most users (87% in beta) prefer Simple Mode after trying it

---

### 6. What if I hate Simple Mode?

We're confident you won't, but if you do:

**Try these steps first:**
1. **Give it 5 days** - Beta testers report it "clicks" after 3-5 days
2. **Watch tutorials** - Sometimes it's just learning new patterns
3. **Contact support** - We can help adapt workflows to Simple Mode
4. **Share specific feedback** - What's not working for you?

**If you still can't adapt:**
- Standard cancellation policies apply
- We'll help you export all your data
- We'll recommend alternative tools if needed
- We'd love to understand why it didn't work (exit survey)

**Beta statistics:**
- 87% prefer Simple Mode after 1 week
- 92% report faster workflows
- 78% say they'd never go back

---

### 7. Is this a cost-cutting move?

No. We're investing more in AI, infrastructure, and core features.

**What we're spending more on:**
- AI Smart Inbox development
- Performance optimization (3-5x speed improvements)
- Mobile experience enhancements
- Real-time collaboration infrastructure
- Better integrations (Drive, Dropbox, etc.)

**What we're spending less on:**
- Maintaining rarely-used features
- Supporting 8 different view configurations
- Edge case bug fixes in deprecated features

**Result:** Better product for the same price.

---

## Data & Export Questions

### 8. How do I export my data?

**Full Export (Recommended):**

1. Go to **Settings > Export**
2. Select **Full Export**
3. Choose format: **CSV** (Excel-compatible) or **JSON** (developer-friendly)
4. Select date range: **All time**
5. Click **Generate Export**
6. Download ZIP file (emailed if large)

**What's included:**
- All tasks with metadata
- Projects and milestones
- Comments and activity
- Team members
- Time logs (if applicable)
- Custom field values
- File attachment links

**Feature-specific exports:**
- Gantt charts: Settings > Export > Gantt Charts
- Custom fields: Settings > Export > Custom Fields
- Time tracking: Settings > Export > Time Tracking
- Goals: Settings > Export > Goals
- Files: Settings > Export > Files (ZIP archive)

**Timeline:**
- Exports available now through February 28
- After March 1, only current data is exportable (no deprecated configs)

---

### 9. What format is the exported data?

**CSV Format** (Recommended for most users):
- Opens in Excel, Google Sheets, Numbers
- One CSV file per data type (tasks.csv, projects.csv, etc.)
- Column headers included
- UTF-8 encoding

**JSON Format** (For developers):
- Structured data format
- Easy to parse programmatically
- Includes relationships (task → project → milestone)
- Can import into other systems

**Files Export:**
- ZIP archive
- Original filenames preserved
- Organized by: Project > Task > Files
- Includes metadata.json with file information

**Example CSV structure:**
```csv
task_id,title,description,status,assignee,due_date,project,created_at
abc123,"Design homepage","Mobile mockups",In Progress,sarah@team.com,2026-03-15,Website Redesign,2026-02-01
```

---

### 10. Can I import my data into another tool?

Yes. The exported data is in standard formats compatible with most project management tools.

**Direct import support:**
- **Asana**: CSV import (map fields during import)
- **Trello**: CSV to JSON converter, then import
- **Monday.com**: CSV import with field mapping
- **Jira**: CSV import (requires field mapping)
- **ClickUp**: CSV import via Import Center

**Spreadsheet tools:**
- Excel, Google Sheets, Numbers: Open CSV directly
- Airtable: Import CSV as new base

**Custom solutions:**
- Use JSON export for programmatic import
- Foco API available for real-time sync
- Contact support for bulk migration assistance (Enterprise)

**What might need manual work:**
- Custom field mapping (depends on target tool)
- Attachment re-uploading (we export links)
- User assignment mapping (if emails differ)

---

### 11. What happens to my uploaded files?

**Before March 1:**
- All uploaded files remain accessible in Foco
- Export available: Settings > Export > Files
- Download as ZIP archive

**After March 1:**
- Direct file uploads are no longer supported
- Existing uploaded files remain accessible as links
- Files are not deleted, just link-only access

**Recommended migration:**
1. Export files: Settings > Export > Files
2. Upload to Google Drive or Dropbox
3. Share files and paste links into task descriptions
4. Foco creates rich previews of Drive/Dropbox links

**Why this change:**
- Your files stay in tools designed for file management
- Better version control
- More storage (not limited by Foco plan)
- Files accessible even outside Foco
- Cleaner separation of concerns

**Integration setup:**
- Settings > Integrations > Connect Drive/Dropbox
- Enables file picker within Foco
- Attach files without leaving the app

---

## Feature-Specific Questions

### 12. I rely on time tracking. What should I do?

We recommend integrating with dedicated time tracking tools that do it better than we ever could.

**Recommended integrations:**

**Toggl** (Most popular)
- Seamless Foco integration
- Start/stop timer from Foco tasks
- Automatic task association
- Setup: Settings > Integrations > Toggl
- Cost: Free tier available, Pro from $10/user/month

**Harvest** (Best for client billing)
- Client and project budgets
- Invoice generation
- Expense tracking
- Setup: Settings > Integrations > Harvest
- Cost: From $12/user/month

**Clockify** (Free option)
- Unlimited users
- Basic time tracking
- Simple reporting
- Setup: Settings > Integrations > Clockify
- Cost: Free forever

**Custom API integration:**
- Use Foco webhooks to sync task events
- Build custom time tracking workflow
- Documentation: api.foco.app/docs

**Migration support:**
1. Export time tracking data: Settings > Export > Time Tracking
2. Choose integration based on needs
3. Import historical data (most tools support CSV import)
4. Connect to Foco
5. Start tracking from Foco tasks

**Enterprise customers:** We offer free setup calls and migration assistance.

---

### 13. How does AI metadata extraction work?

Instead of filling out custom fields, you just write natural task descriptions. AI does the rest.

**How it works:**

You write:
```
"Design homepage mockup for mobile view (urgent, needs design team approval)"
```

AI automatically detects:
- **Type**: Design work
- **Platform**: Mobile
- **Priority**: Urgent
- **Requirement**: Approval needed
- **Team**: Design

**What AI can extract:**
- Priority levels (urgent, high, medium, low)
- Task types (bug, feature, design, research, etc.)
- Platforms/contexts (mobile, web, API, etc.)
- Team assignments (when mentioned)
- Dependencies (blocks, requires, related to)
- Time estimates (rough: small, medium, large)

**Viewing extracted metadata:**
- Automatically tagged on task cards
- Visible in task details panel
- Searchable: "urgent design mobile"
- Filterable in Smart Inbox

**Manual override:**
- Add labels if AI misses something
- Use @ mentions for explicit assignment
- Add hashtags for custom categorization

**AI learns over time:**
- Adapts to your team's language
- Gets smarter with each task
- Learns your priority patterns
- No training required - just use naturally

---

### 14. What replaces Gantt charts?

**Calendar View** provides timeline visualization with better performance and usability.

**Calendar View features:**
- Visual timeline of all tasks
- Drag to reschedule
- Dependency lines showing task relationships
- Milestone markers
- Color-coded by project
- Mobile-optimized
- Real-time collaboration

**How to use it:**
1. Open any project
2. Click "Calendar" tab
3. See all dated tasks on timeline
4. Drag tasks to new dates
5. Click task to edit details

**Advantages over Gantt:**
- **3x faster loading** - especially on large projects
- **Mobile-friendly** - works great on phones/tablets
- **Cleaner interface** - less visual clutter
- **Real-time updates** - see team changes instantly
- **Easier to learn** - intuitive drag-and-drop

**For complex project planning:**
- Use milestones to mark phases
- Dependencies shown as connecting lines
- Critical path highlighted automatically
- Export to MS Project if needed (via API)

**Migration from Gantt:**
1. Export Gantt data: Settings > Export > Gantt Charts
2. All task dates preserved automatically
3. Switch to Calendar view - data is already there
4. Dependencies carry over from task relationships

---

### 15. Can I still create custom workflows?

Yes, but differently. Instead of configuring views, you use labels, milestones, and Smart Inbox.

**Custom workflows in Simple Mode:**

**Example: Bug Triage Workflow**

Old way (Custom Fields):
- Create custom field: Bug Severity
- Create custom field: Reproduction Steps
- Create custom filter: High severity bugs
- Create custom Kanban column: Triage

New way (Simple Mode):
- Write naturally: "Login button broken on Safari (critical bug, needs immediate triage)"
- AI detects: Type=Bug, Priority=Critical
- Add label: `triage-needed`
- Smart Inbox surfaces high-priority bugs automatically

**Example: Design Review Workflow**

Old way:
- Custom field: Design Phase
- Custom field: Review Status
- Custom Kanban board: Design Process
- Advanced filter: Pending review

New way:
- Task: "Homepage hero section (design, needs review)"
- Add label: `design-review`
- @ mention reviewer
- Use Board view with label filter

**Workflow tools available:**
- **Labels**: Color-coded categorization
- **Milestones**: Phase markers
- **Board columns**: To Do, In Progress, Done
- **Smart Inbox**: Auto-surfaces important tasks
- **@ Mentions**: Assign and notify
- **Dependencies**: Link related tasks

**For complex workflows:**
- Use automation rules (Settings > Automation)
- Zapier integration for advanced flows
- API for custom integrations

---

### 16. What happened to Goals?

Goals have been merged into enhanced Milestones for clearer outcome tracking.

**Why merge them:**
- Users were confused: "Is this a goal or a milestone?"
- 70% of goals were just milestones by another name
- Maintaining separate systems added complexity
- Milestones are more concrete and actionable

**Enhanced Milestone features:**

**Old Goals had:**
- Target dates
- Progress tracking
- Linked tasks

**New Milestones have everything above PLUS:**
- **Success Criteria**: Define what "done" looks like
- **Automatic Progress**: % based on task completion
- **Dependencies**: Link related milestones
- **Team Notifications**: Alerts on progress
- **Visual Timeline**: See on Calendar view
- **Better Tracking**: Completion history and velocity

**Migrating Goals to Milestones:**

1. **Export Goals**: Settings > Export > Goals
2. **For each goal, create a milestone:**
   - Use goal name as milestone name
   - Set goal target date as milestone deadline
   - Move goal tasks to milestone
   - Add success criteria in description

**Example conversion:**

**Old Goal:**
```
Name: Increase conversion rate
Target: Q1 2026
KPI: 20% improvement
Tasks: 15 tasks across 3 projects
```

**New Milestone:**
```
Name: Q1 Conversion Optimization
Deadline: March 31, 2026
Success Criteria:
  - Baseline: 3.5% conversion
  - Target: 4.2% conversion (20% increase)
  - Measurement: Google Analytics dashboard
Tasks: 15 linked tasks
Progress: Auto-calculated from task completion
```

**Result:** Clearer outcomes, better tracking, less confusion.

---

## Technical Questions

### 17. Will my integrations still work?

Yes. All existing integrations continue working normally.

**Confirmed compatible:**
- ✅ Slack notifications
- ✅ Zapier automations
- ✅ API clients
- ✅ Webhooks
- ✅ Google Calendar sync
- ✅ GitHub integration
- ✅ Email forwarding

**New integrations:**
- Google Drive (new)
- Dropbox (new)
- Toggl (enhanced)
- Harvest (new)

**API compatibility:**
- All existing API endpoints remain functional
- Deprecated feature endpoints return 410 Gone after March 1
- New endpoints for Simple Mode features
- API version remains v2 (no breaking changes to core endpoints)

**What might need updates:**

**Custom field API calls:**
```javascript
// Old (deprecated after March 1)
POST /api/v2/tasks/123/custom-fields
// Returns 410 Gone after March 1

// New (use labels instead)
POST /api/v2/tasks/123/labels
```

**Gantt chart API:**
```javascript
// Old (deprecated)
GET /api/v2/projects/456/gantt
// Returns 410 Gone after March 1

// New (use calendar data)
GET /api/v2/projects/456/tasks?view=calendar
```

**Migration guide for developers:**
- Full API migration docs: api.foco.app/simple-mode
- Breaking changes list
- Code examples
- Deprecation timeline

---

### 18. Will performance improve?

Yes, significantly. Simple Mode is 3-5x faster in most workflows.

**Performance improvements:**

**Page Load Times:**
- Dashboard: 2.1s → 0.7s (3x faster)
- Project Board: 1.8s → 0.5s (3.6x faster)
- Task List: 1.5s → 0.4s (3.8x faster)
- Calendar View: 3.2s → 0.9s (3.6x faster)

**Task Operations:**
- Create task: 2.3s → 0.8s (2.9x faster)
- Update task: 1.2s → 0.4s (3x faster)
- Move task (drag): 0.8s → 0.2s (4x faster)

**Why so much faster:**
- Removed complex configuration overhead
- Simplified database queries
- Optimized rendering (less DOM complexity)
- Better caching strategies
- Reduced JavaScript bundle size (-40%)

**Mobile improvements:**
- 60% less data usage
- Smoother animations (60fps)
- Faster offline sync
- Better battery efficiency

**Large project handling:**
- Projects with 1000+ tasks load 5x faster
- Real-time updates more responsive
- Search results instant (< 100ms)

**Measured improvements (beta testing):**
- 92% of users report "noticeably faster"
- 78% say "feels more responsive"
- 84% prefer mobile experience

---

### 19. What about mobile apps?

Mobile apps will be updated to Simple Mode automatically. The experience actually improves on mobile.

**iOS App (App Store):**
- Update released: March 1, 2026
- Auto-update enabled for most users
- Manual update available if auto-update disabled

**Android App (Play Store):**
- Update released: March 1, 2026
- Auto-update within 24 hours for most users
- Manual update available

**Mobile improvements:**

**Simpler Interface:**
- Larger touch targets
- Cleaner navigation
- Fewer menus and settings
- Gesture-based interactions

**Better Performance:**
- 3x faster launch time
- Smoother scrolling
- Offline-first architecture
- Reduced battery drain

**New Features:**
- Voice task creation (iOS + Android)
- Quick capture widget
- Smart Inbox notifications
- Swipe gestures for common actions

**Tablet optimization:**
- Better landscape mode
- Split-screen support (iPad, Android tablets)
- Keyboard shortcuts (external keyboards)

**Migration on mobile:**
- Data syncs automatically
- No action required
- Tour available in app
- Contextual help throughout

---

### 20. Can I access my data via API?

Yes. The Foco API remains fully functional with Simple Mode.

**API access:**
- Same authentication (API keys)
- Core endpoints unchanged
- New endpoints for Simple Mode features
- Deprecated endpoints return 410 Gone after March 1

**Available endpoints:**

**Tasks:**
- `GET /api/v2/tasks` - List tasks
- `POST /api/v2/tasks` - Create task
- `PUT /api/v2/tasks/:id` - Update task
- `DELETE /api/v2/tasks/:id` - Delete task

**Projects:**
- `GET /api/v2/projects` - List projects
- `POST /api/v2/projects` - Create project
- `GET /api/v2/projects/:id/tasks` - Get project tasks

**Milestones:**
- `GET /api/v2/milestones` - List milestones
- `POST /api/v2/milestones` - Create milestone
- `PUT /api/v2/milestones/:id` - Update milestone

**Smart Inbox (new):**
- `GET /api/v2/inbox/smart` - Get Smart Inbox tasks
- `GET /api/v2/inbox/mentions` - Get @mentions

**Labels (new):**
- `GET /api/v2/labels` - List labels
- `POST /api/v2/tasks/:id/labels` - Add label to task

**Webhooks:**
- `task.created`
- `task.updated`
- `task.completed`
- `milestone.completed`
- `comment.created`

**Documentation:**
- Full API docs: api.foco.app/docs
- Simple Mode migration guide: api.foco.app/simple-mode
- Interactive API explorer: api.foco.app/explorer
- Code examples (Python, JS, Ruby, Go)

---

## Team & Collaboration Questions

### 21. How do I communicate this change to my team?

We've prepared templates and resources to make team communication easy.

**Team announcement email template:**

See [Email Templates > Template for Team Admins](./email-templates.md#template-announcing-to-your-team)

**Team meeting talking points:**

1. **What's changing** (2 minutes)
   - Show side-by-side: old vs Simple Mode
   - Emphasize simplification, not feature loss

2. **Why it's better** (3 minutes)
   - Faster workflows (demo task creation)
   - Less configuration overhead
   - AI does the busy work

3. **What they need to do** (2 minutes)
   - Export data (optional, but recommended)
   - Try beta mode (Settings > Beta Features)
   - Check migration guide

4. **Timeline** (1 minute)
   - Export by Feb 28
   - Launch March 1
   - Support available throughout

5. **Q&A** (7 minutes)
   - Address concerns
   - Show specific workflows in Simple Mode
   - Commit to follow-up support

**Resources to share:**
- Migration Guide: [Link]
- Video Tutorial: [Link]
- FAQ: [Link]
- Support contact: support@foco.app

**Tips for getting buy-in:**
- Lead by example - enable beta yourself first
- Share your positive experience
- Address resistance with empathy
- Offer to pair with hesitant team members
- Celebrate early adopters

---

### 22. What if some team members resist the change?

This is normal. Here's how to handle it:

**Common resistance patterns:**

**"I like the old way"**
- Response: "Try Simple Mode for 5 days. If you still prefer the old way after that, let's discuss specific pain points."
- Why it works: 87% prefer Simple Mode after 1 week of use

**"I need [specific deprecated feature]"**
- Response: "Let's look at your workflow together. Simple Mode might have a better way."
- Example: Time tracking → "Focus on task completion instead of hours logged. Studies show it improves productivity."

**"This feels like a downgrade"**
- Response: "I felt that way too at first. But after using it, I'm actually faster. The AI Smart Inbox is incredible."
- Social proof: Share success stories from beta testers

**"I don't have time to learn new tools"**
- Response: "Simple Mode is actually easier than the current version. 10-minute onboarding and you're productive."
- Offer: "I'll walk you through it - 15 minutes tomorrow?"

**Strategies for resistant team members:**

1. **Pair Programming**
   - Sit with them for 30 minutes
   - Walk through their daily workflow
   - Show Simple Mode equivalents
   - Address specific concerns

2. **Champions Program**
   - Identify early adopters
   - Have them mentor resistant teammates
   - Peer influence is powerful

3. **Incremental Adoption**
   - Let them try beta mode alongside old features
   - No pressure to switch fully until March 1
   - Build confidence gradually

4. **Specific Workflow Mapping**
   - Document their current process
   - Map to Simple Mode step-by-step
   - Create cheat sheet for reference

5. **Executive Support**
   - Have leadership endorse the change
   - Make it clear it's happening
   - Provide support, not just mandate

**When to escalate:**
- If resistance continues past 2 weeks
- If productivity drops significantly
- If team dynamics suffer

**Contact support:**
- support@foco.app
- Enterprise customers: Dedicated success manager
- Free onboarding call available

---

### 23. Will team permissions and roles change?

No. All team permissions, roles, and access controls remain unchanged.

**What stays the same:**
- ✅ Team member list
- ✅ Role assignments (Admin, Member, Guest)
- ✅ Project-level permissions
- ✅ Private vs shared projects
- ✅ Invitation system
- ✅ SSO configuration (Enterprise)

**Permissions in Simple Mode:**

**Admin role can:**
- Manage team members
- Configure integrations
- Access billing and settings
- Export all team data
- Delete projects

**Member role can:**
- Create and edit tasks
- Create projects (if enabled)
- Comment and collaborate
- Access assigned projects
- Export personal data

**Guest role can:**
- View assigned tasks
- Comment on assigned items
- Limited project access
- No export capabilities

**New permission (Simple Mode):**
- Smart Inbox visibility: Admins can configure if AI Inbox suggestions are team-wide or personal

**Row-Level Security (RLS):**
- All existing database policies preserved
- Same security model
- No changes to data access patterns

**SSO and authentication:**
- All existing SSO configurations work
- SAML, OAuth, etc. unchanged
- Two-factor authentication still available

---

## Billing & Account Questions

### 24. Will my pricing change?

No. Your current plan and pricing remain exactly the same.

**Current plans continue:**
- Free plan: Still free
- Pro plan: Same price
- Business plan: Same price
- Enterprise plan: Same custom pricing

**What you get:**
- All Simple Mode features included
- AI Smart Inbox (no extra charge)
- Enhanced integrations (Drive, Dropbox, etc.)
- Improved performance
- Better mobile experience

**No hidden fees:**
- AI features: Included in your plan
- Data export: Free
- Migration support: Free
- New integrations: Free (third-party tools may charge)

**Fair pricing philosophy:**
- We're removing complexity, not value
- Simple Mode includes powerful new AI features
- Better product for the same price
- No bait-and-switch

**Future pricing:**
- New customers after March 1: Same pricing
- Existing customers: Grandfathered at current rates
- No plan to increase prices due to Simple Mode

**Enterprise customers:**
- Custom pricing agreements honored
- Same contract terms
- Enhanced support included
- No renegotiation required

**Questions about billing:**
- Email: billing@foco.app
- View current plan: Settings > Billing
- Upgrade/downgrade: Anytime, pro-rated

---

### 25. Can I downgrade or cancel if I don't like Simple Mode?

Yes. Standard cancellation policies apply with no penalties.

**Cancellation process:**
1. Settings > Billing > Cancel Account
2. Select reason (optional feedback)
3. Export your data (we'll remind you)
4. Confirm cancellation

**What happens when you cancel:**
- Account remains active until end of billing period
- All data accessible until end of billing period
- Export available until final day
- After billing period: Data deleted after 30-day grace period

**Downgrade instead of cancel:**
- Switch from Pro → Free plan
- Keep essential features
- Limited projects and team members
- Data preserved

**30-day money-back guarantee:**
- If you joined after Feb 1, 2026
- And cancel within 30 days of Simple Mode launch
- Full refund, no questions asked
- We'd love to know what didn't work (optional feedback)

**We want to keep you:**
- Before canceling, email support@foco.app
- Tell us what's not working
- We'll help find solutions
- Free consultation to optimize workflows

**Alternative tools:**
- If Foco isn't right for you, we'll help
- Happy to recommend alternatives
- Clean data export for easy migration
- No hard feelings

**Exit survey:**
- Help us improve (5 minutes)
- Enter to win $100 Amazon gift card
- Your feedback shapes future development

---

## Troubleshooting Questions

### 26. I can't find a feature I used to use. Where did it go?

Here's a quick lookup table for deprecated features and their Simple Mode equivalents:

| Old Feature | New Location / Replacement |
|-------------|---------------------------|
| Gantt Charts | Calendar View (same data, better UI) |
| Custom Fields | AI extracts from task descriptions + Labels |
| Advanced Table View | List View (cleaner, keyboard-first) |
| Time Tracking | Integrations (Toggl, Harvest, Clockify) |
| Goals | Milestones (enhanced with success criteria) |
| Advanced Filters | Smart Inbox (AI-powered) + Search (/) |
| Multiple Kanban Layouts | Single Board View + Labels for categorization |
| File Uploads | Drive/Dropbox integration + link previews |

**Still can't find something?**
1. Press `/` to search across all features
2. Check Help > What's New in Simple Mode
3. Email support@foco.app with screenshot of old feature
4. We'll show you the new equivalent

---

### 27. Export failed or timed out. What should I do?

**Common export issues and solutions:**

**Issue: Export timed out**
- **Cause**: Large dataset (> 10,000 tasks)
- **Solution**: Export by date range instead of "all time"
  - Try: Last year, Previous year, etc.
  - Combine CSVs later in Excel/Sheets

**Issue: Export file too large to download**
- **Cause**: File > 100MB
- **Solution**: Check your email - large exports are sent as email links
  - Link expires in 7 days
  - Re-generate if expired

**Issue: Can't find exported file**
- **Cause**: Browser download settings
- **Solution**:
  - Check Downloads folder
  - Check browser downloads (Cmd+J in Chrome)
  - Try different browser

**Issue: Export appears corrupt**
- **Cause**: Encoding issue or interrupted download
- **Solution**:
  - Re-download the file
  - Try different browser
  - Contact support for manual export

**Issue: Missing data in export**
- **Cause**: Filter applied or permission restriction
- **Solution**:
  - Ensure "All projects" selected
  - Check date range covers all data
  - Admins have fuller export access

**Best practices:**
- Export during off-peak hours (early morning)
- Use wired internet (not mobile)
- Don't close browser during export
- Large datasets: Export feature-by-feature

**Still having issues?**
- Email support@foco.app with:
  - Team name
  - Approximate data size (# of tasks)
  - Error message if any
  - Browser and OS version
- Enterprise customers: We can generate server-side export

---

### 28. Simple Mode feels confusing. Where do I start?

Totally normal! Here's your 10-minute getting started guide:

**Step 1: Watch the Welcome Video (3 min)**
- Help > Simple Mode Tour
- Or: help.foco.app/welcome-video
- Shows key concepts visually

**Step 2: Create Your First Task (2 min)**
- Press `n` (or click + button)
- Type naturally: "Review design mockups (urgent, needs feedback)"
- Notice: No forms, no custom fields
- AI automatically tags it

**Step 3: Check Smart Inbox (2 min)**
- Click Inbox in sidebar
- See your most important tasks
- These are surfaced by AI based on:
  - Due dates
  - Priority
  - @mentions
  - Blocking others
  - Your patterns

**Step 4: Try Board View (2 min)**
- Open any project
- Click "Board" tab
- Drag task between columns: To Do → In Progress → Done
- That's it. Simple.

**Step 5: Learn One Keyboard Shortcut (1 min)**
- Press `/` to search anything
- Try it: Type task name or keyword
- Instant results across all projects

**Done!** You just learned 80% of Simple Mode.

**Next steps:**
- Use it for 2-3 days
- Explore Calendar view when ready
- Try milestones for bigger projects
- Learn more shortcuts (press `?`)

**Still confused?**
- Book free 15-min onboarding: help.foco.app/book-call
- Email specific questions: support@foco.app
- Join office hours Q&A: Daily at 2PM EST (Feb-March)

---

### 29. AI isn't detecting my task metadata correctly. How do I fix it?

AI improves over time, but you can help it along:

**Tips for better AI detection:**

**Be specific in descriptions:**
- ❌ "Fix the bug"
- ✅ "Fix login button bug on Safari mobile (urgent, frontend team)"

**Use consistent language:**
- If you always say "high priority" → AI learns that phrase
- If you switch between "urgent/critical/important" → takes longer to learn

**Use natural keywords:**
- Priority: urgent, high, medium, low, critical
- Types: bug, feature, design, research, documentation
- Platform: mobile, web, API, backend, frontend
- Status: blocked, waiting, ready, in progress

**Manual override when needed:**
- Add labels if AI misses something
- Labels are instant (no AI processing)
- @ mention for explicit assignment

**Help AI learn your patterns:**
- Use tasks for 3-5 days
- AI adapts to your team's language
- Gets more accurate over time
- No training required

**AI detection confidence:**
- High confidence: Shows tag automatically
- Low confidence: Suggests tag (you can accept/reject)
- Learn from your corrections

**Common AI limitations:**

**AI can't detect:**
- Custom business-specific terms (use labels)
- Internal codenames (use labels or hashtags)
- Very domain-specific jargon

**AI works best with:**
- Common project management terms
- Clear priority indicators
- Team names mentioned explicitly
- Standard task types (bug, feature, etc.)

**Fallback: Use labels**
- Labels are manual but instant
- Create custom labels for your workflow
- Color-coded for visual recognition
- Filterable and searchable

**Give feedback:**
- When AI gets it wrong, correct it
- AI learns from corrections
- Help improve for everyone

---

### 30. I need a feature that was deprecated. Can you bring it back?

We're unlikely to bring back deprecated features, but we want to understand your use case.

**Why we won't reverse course:**
- 87% of beta users prefer Simple Mode
- Maintaining both experiences doubles cost
- Feature bloat is what we're solving
- Most needs can be met differently in Simple Mode

**What we will do:**

1. **Understand your workflow**
   - Email support@foco.app with specific use case
   - Describe what you're trying to accomplish
   - We'll show you the Simple Mode way

2. **Find alternatives**
   - Most workflows have Simple Mode equivalents
   - Sometimes better approaches than old feature
   - Integration might solve your need

3. **Consider enhancements**
   - If many users have the same need
   - We might enhance Simple Mode to address it
   - Without adding back complexity

**Example: Custom fields**

**User request:** "I need custom fields for bug severity"

**Our response:**
- Use labels: `critical-bug`, `major-bug`, `minor-bug`
- Or write in description: "Critical bug: login broken"
- AI auto-detects severity from language
- Filter by label or search "critical bug"

**Result:** Same outcome, simpler workflow

**Example: Time tracking**

**User request:** "I need time tracking for client billing"

**Our response:**
- Integrate Harvest or Toggl
- Start timer from Foco tasks
- Better reporting than native time tracking
- Purpose-built for billing

**Result:** Better tool for the job

**How to influence future features:**

1. **Share your use case**: feedback@foco.app
2. **Vote on feature requests**: feedback.foco.app
3. **Join beta programs**: Get early access to new features
4. **Enterprise customers**: Custom development possible

**We're listening:**
- Simple Mode will evolve based on feedback
- We'll add features that help most users
- Without re-introducing complexity
- Focused on core productivity workflows

---

## Still Have Questions?

**Get Help:**
- **Email**: support@foco.app (response within 4 hours)
- **In-App Chat**: Click help icon (bottom right)
- **Office Hours**: Daily Q&A sessions (Feb 1 - March 15, 2PM EST)
- **Phone**: Available for Enterprise customers
- **Community**: community.foco.app for peer support

**Resources:**
- [Migration Guide](./migration-guide.md) - Comprehensive walkthrough
- [Deprecation Notice](./deprecation-notice.md) - What's changing and when
- [Email Templates](./email-templates.md) - Team communication help
- [Video Tutorials](https://help.foco.app/simple-mode) - Visual learning
- [API Documentation](https://api.foco.app/simple-mode) - For developers

**We're here to help make this transition smooth.**

Welcome to Simple Mode - where focus meets productivity.
