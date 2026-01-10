# Foco Simple Mode - Complete Migration Guide

Welcome to Simple Mode! This guide will help you transition smoothly from deprecated features to streamlined workflows.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Feature-by-Feature Migration](#feature-by-feature-migration)
3. [Export Procedures](#export-procedures)
4. [New Workflows](#new-workflows)
5. [FAQs](#faqs)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 3-Step Migration

1. **Export** your data from deprecated features (Settings > Export)
2. **Review** the feature mapping below to understand alternatives
3. **Adopt** Simple Mode workflows (they're faster, we promise!)

### Migration Checklist

- [ ] Export Gantt chart data to Calendar view
- [ ] Export custom field definitions (if needed for records)
- [ ] Save advanced table view configurations
- [ ] Export time tracking reports
- [ ] Migrate goals to milestones
- [ ] Document complex filter definitions
- [ ] Export Kanban customizations
- [ ] Move uploaded files to Drive/Dropbox

---

## Feature-by-Feature Migration

### 1. Gantt Charts → Simple Kanban + Calendar

**What's Changing**

Gantt charts are being replaced by two focused views:
- **Simple Kanban**: Visual workflow for task status
- **Calendar View**: Timeline visualization with dependencies

**Why This is Better**

- Faster to load (3x performance improvement)
- Mobile-friendly interface
- Real-time collaboration without lag
- Cleaner, more intuitive design

**Migration Steps**

1. **Export Gantt Data**
   ```
   Settings > Export > Gantt Charts
   - Download as: CSV or JSON
   - Includes: task dates, dependencies, critical path
   ```

2. **Switch to Calendar View**
   - Navigate to your project
   - Click "Calendar" tab
   - All task dates appear automatically
   - Drag to reschedule
   - Dependencies shown as connecting lines

3. **Use Kanban for Status**
   - Click "Board" tab
   - See tasks organized by status: To Do, In Progress, Done
   - Drag cards between columns
   - Visual progress at a glance

**Pro Tips**

- Use Calendar for timeline planning
- Use Kanban for daily standup reviews
- Both views sync in real-time
- Set milestone deadlines to create time boundaries

### 2. Custom Fields → AI-Powered Metadata

**What's Changing**

Manual custom fields are replaced by AI that automatically extracts metadata from your task descriptions.

**Why This is Better**

- No more filling out forms for every task
- AI learns your patterns and categorizes automatically
- Faster task creation (60% time savings)
- Smart suggestions based on context

**Migration Steps**

1. **Export Custom Field Definitions**
   ```
   Settings > Export > Custom Fields
   - Saves field names, types, and options
   - Use for historical reference
   ```

2. **Document Field Usage**
   - Note which fields you actively use
   - Most teams only use 2-3 custom fields regularly
   - These can be added to task descriptions

3. **Let AI Do the Work**
   - Write natural task descriptions: "Design homepage mockup for mobile (high priority, design team)"
   - AI automatically detects:
     - Priority: High
     - Team: Design
     - Type: Design work
     - Platform: Mobile
   - View extracted metadata in task details

**Pro Tips**

- Be specific in task descriptions
- AI learns from your patterns over time
- Use labels for manual categorization when needed
- @ mention team members to assign automatically

### 3. Advanced Table View → Simple List View

**What's Changing**

Complex table configurations are replaced by a clean, keyboard-first list view.

**Why This is Better**

- Faster loading (5x improvement on large projects)
- Keyboard shortcuts for everything
- Clean, distraction-free interface
- Focus on what matters: getting tasks done

**Migration Steps**

1. **Export Table Configuration**
   ```
   Settings > Export > Table Views
   - Saves column configurations
   - Preserves sort and filter settings
   ```

2. **Switch to Simple List**
   - Navigate to project
   - Click "List" tab
   - See tasks in clean, linear format
   - Essential info visible: title, assignee, due date, status

3. **Learn Keyboard Shortcuts**
   - `n` - New task
   - `e` - Edit task
   - `Cmd+Enter` - Mark complete
   - `↑/↓` - Navigate tasks
   - `/` - Search and filter

**Pro Tips**

- Use search (`/`) instead of complex filters
- Sort by due date to prioritize
- Group by assignee for team reviews
- List view syncs with Board and Calendar

### 4. Time Tracking → Completion Focus

**What's Changing**

Time tracking is being removed in favor of completion-based workflows.

**Why This is Better**

- Research shows time tracking reduces productivity by 15%
- Focus shifts from "hours logged" to "outcomes delivered"
- Less administrative overhead
- Better work-life balance

**Migration Steps**

1. **Export Time Tracking Data**
   ```
   Settings > Export > Time Tracking
   - Downloads: CSV with all logged hours
   - Includes: task, user, date, duration, notes
   - Useful for: billing, historical analysis, reports
   ```

2. **Generate Final Reports**
   - Run reports for billing purposes before March 1
   - Export to accounting software
   - Save for client invoicing

3. **Adopt Completion Metrics**
   - Track tasks completed instead of hours logged
   - Use milestone completion rates
   - Measure velocity: tasks/week instead of hours/week

**For Teams Requiring Time Data**

- Integrate with dedicated time tracking tools (Toggl, Harvest)
- Use Foco's API to sync task completion events
- Focus on outcomes in Foco, time tracking externally

**Pro Tips**

- Set realistic task estimates (S/M/L) instead of hours
- Celebrate completed work, not time spent
- Use milestones to track project progress
- Review velocity to improve future planning

### 5. Goals → Milestones

**What's Changing**

The separate "Goals" feature is being merged into enhanced Milestones.

**Why This is Better**

- One unified system for tracking progress
- Clearer connection between milestones and tasks
- Less confusion about goals vs. milestones
- Better alignment with project outcomes

**Migration Steps**

1. **Export Goals**
   ```
   Settings > Export > Goals
   - Saves all goal definitions and progress
   ```

2. **Map Goals to Milestones**
   - For each goal, create a milestone
   - Move goal tasks to milestone
   - Set milestone deadline based on goal target date
   - Add success metrics in milestone description

3. **Enhanced Milestone Features**
   - **Progress Tracking**: Automatic % based on task completion
   - **Success Criteria**: Define what "done" looks like
   - **Dependencies**: Link related milestones
   - **Notifications**: Team alerts on milestone progress

**Example Conversion**

**Old Goal:**
```
Goal: Increase conversion rate by 20%
Target: Q1 2026
Tasks: 15 tasks across 3 projects
```

**New Milestone:**
```
Milestone: Q1 Conversion Optimization
Deadline: March 31, 2026
Success Criteria: 20% conversion increase (baseline: 3.5%, target: 4.2%)
Tasks: 15 tasks (automatically linked)
Progress: Auto-calculated from task completion
```

**Pro Tips**

- Use milestones for measurable outcomes
- Add success metrics in description
- Link related milestones for program tracking
- Set realistic deadlines with buffer time

### 6. Advanced Filters → AI-Powered Smart Inbox

**What's Changing**

Complex manual filters are replaced by an AI-powered Smart Inbox that surfaces what needs your attention.

**Why This is Better**

- No more filter configuration overhead
- AI learns what's important to you
- Adapts to your work patterns
- Reduces decision fatigue

**Migration Steps**

1. **Export Filter Definitions**
   ```
   Settings > Export > Filters
   - Saves your filter logic for reference
   ```

2. **Document Key Filters**
   - Note the 2-3 filters you use daily
   - These often become redundant with Smart Inbox

3. **Use Smart Inbox**
   - Navigate to Inbox
   - AI automatically shows:
     - Tasks you're assigned to
     - Overdue items requiring attention
     - Tasks blocking others
     - High-priority items from your projects
     - @mentions and comments

4. **Quick Search Instead of Filters**
   - Press `/` to search
   - Type keywords: "urgent design mobile"
   - Instant results across all projects

**Smart Inbox Categories**

- **Needs Attention**: Overdue, blocking, or urgent
- **Today**: Due today or in progress
- **Upcoming**: Due this week
- **Mentions**: Where you've been @mentioned
- **Watching**: Tasks you're following

**Pro Tips**

- Check Smart Inbox daily instead of scanning projects
- Use search (`/`) for specific queries
- Star critical tasks for easy access
- Trust the AI - it learns from your patterns

### 7. Multiple Kanban Customizations → One Simple Board

**What's Changing**

Multiple board layouts and customizations are replaced by one beautifully designed Kanban board.

**Why This is Better**

- Eliminates configuration paralysis
- Consistent experience across all projects
- Faster to learn for new team members
- Mobile-optimized design

**Migration Steps**

1. **Export Board Configurations**
   ```
   Settings > Export > Kanban Settings
   - Saves custom columns, WIP limits, colors
   ```

2. **Adapt to Standard Workflow**
   - Standard columns: To Do, In Progress, Done
   - Works for 95% of teams
   - Reduces context switching between projects

3. **Use Labels for Categorization**
   - Add labels instead of custom columns
   - Color-coded for visual distinction
   - Filter by label when needed

**Standard Board Features**

- **Drag & Drop**: Move tasks between status columns
- **Card Details**: Click to expand task information
- **Quick Edit**: Update title, assignee, due date inline
- **Visual Progress**: See completion status at a glance
- **Real-time Updates**: See teammates' changes instantly

**Pro Tips**

- Use labels for task types (bug, feature, design)
- Filter by assignee during standups
- Set WIP limits mentally (e.g., max 3 in progress)
- Celebrate moving cards to "Done"

### 8. File Uploads → Drive/Dropbox Integration

**What's Changing**

Direct file uploads are replaced by seamless Drive/Dropbox integration.

**Why This is Better**

- Files stay in your existing workflow
- Better version control
- More storage space
- Easier collaboration
- Files accessible even outside Foco

**Migration Steps**

1. **Export Uploaded Files**
   ```
   Settings > Export > Files
   - Downloads ZIP of all uploaded files
   - Organized by project/task
   ```

2. **Move Files to Cloud Storage**
   - Upload to Google Drive or Dropbox
   - Maintain folder structure: Project > Task > Files

3. **Link Files to Tasks**
   - In task description, paste Drive/Dropbox link
   - Foco automatically creates rich preview
   - Click to open file directly

4. **Connect Your Account** (Optional)
   - Settings > Integrations > Connect Drive/Dropbox
   - Enables file picker within Foco
   - Search and attach files without leaving app

**Pro Tips**

- Use shared folders for project files
- Paste links in task descriptions
- Enable Drive/Dropbox integration for seamless workflow
- Files remain accessible if you leave Foco

---

## Export Procedures

### Full Export (Recommended)

**When to Use**: Before March 1, 2026, to preserve all data

**Steps**:
1. Settings > Export > Full Export
2. Select date range: "All time"
3. Choose format: CSV (Excel-compatible) or JSON (developer-friendly)
4. Click "Generate Export"
5. Download ZIP file (arrives via email if large)

**What's Included**:
- All tasks with metadata
- Projects and milestones
- Comments and activity history
- Team members and assignments
- Time tracking logs (if applicable)
- Custom field values
- File attachments

### Feature-Specific Exports

**Gantt Charts**
```
Settings > Export > Gantt Charts
Format: CSV or MS Project XML
Includes: Dependencies, critical path, timeline
```

**Custom Fields**
```
Settings > Export > Custom Fields
Format: JSON
Includes: Field definitions, values, usage stats
```

**Time Tracking**
```
Settings > Export > Time Tracking
Format: CSV
Includes: User, task, date, hours, notes
```

**Goals**
```
Settings > Export > Goals
Format: CSV or JSON
Includes: Goal definitions, progress, linked tasks
```

**Files**
```
Settings > Export > Files
Format: ZIP archive
Includes: All uploaded files, organized by project
```

---

## New Workflows

### Daily Workflow (Simple Mode)

**Morning (5 minutes)**
1. Open Smart Inbox
2. Review "Needs Attention" section
3. Star top 3 priorities for today
4. Check "Today" section for meetings/deadlines

**During Work**
1. Work from starred tasks
2. Update task status as you go
3. Add new tasks as they arise (quick capture)
4. Comment on tasks for team updates

**End of Day (2 minutes)**
1. Mark completed tasks as Done
2. Update any blockers in comments
3. Check tomorrow's tasks in Smart Inbox

### Weekly Planning (Simple Mode)

**Start of Week (15 minutes)**
1. Review milestones: Dashboard > Milestones
2. Check Calendar view for upcoming deadlines
3. Assign tasks for the week
4. Adjust priorities in Smart Inbox

**End of Week (10 minutes)**
1. Review completed tasks: Board > Done column
2. Archive completed milestones
3. Plan next week's priorities
4. Celebrate wins with team

### Project Kickoff (Simple Mode)

1. **Create Project**: Dashboard > New Project
2. **Set Milestones**: Define 3-5 key outcomes with deadlines
3. **Add Tasks**: Voice planning or quick capture
4. **Assign Team**: @ mention collaborators
5. **Review Timeline**: Calendar view to validate sequencing
6. **Share Context**: Add project description and links

### Team Collaboration (Simple Mode)

1. **Standups**: Review Board view filtered by assignee
2. **Progress Updates**: Check milestone progress bars
3. **Blockers**: Use @mentions in comments
4. **Decisions**: Comment on tasks with context
5. **Celebrations**: Move cards to Done together

---

## FAQs

### General Questions

**Q: Will I lose any data in the transition?**

A: No. All tasks, projects, milestones, comments, and team data are preserved. We're only removing configuration complexity, not your work.

**Q: Can I still access deprecated features after March 1?**

A: No. Deprecated features will be removed. Export your data before February 28 to preserve historical information.

**Q: What if I really need time tracking?**

A: Integrate with dedicated time tracking tools like Toggl or Harvest. Use Foco's API to sync task events. We're focusing on what Foco does best: task and project management.

**Q: Can I give feedback on Simple Mode?**

A: Absolutely! Email feedback@foco.app or use the in-app feedback button. We're continuously improving based on user input.

### Migration Questions

**Q: How long does migration take?**

A: Most teams complete migration in under 30 minutes:
- Export: 5 minutes
- Review guide: 10 minutes
- Adjust workflows: 15 minutes

**Q: Do I need to migrate all at once?**

A: No. You can explore Simple Mode alongside existing features until March 1. Test new workflows before fully committing.

**Q: What happens to my existing projects?**

A: They remain unchanged. Simple Mode applies to how you interact with projects, not the projects themselves.

**Q: Can I undo the migration?**

A: Until March 1, you can switch between views. After March 1, deprecated features are removed, but your data remains intact.

### Technical Questions

**Q: Will my integrations still work?**

A: Yes. API endpoints remain compatible. Zapier, Slack, and other integrations continue working normally.

**Q: What about mobile apps?**

A: Mobile apps will be updated to Simple Mode automatically. The streamlined interface is actually better on mobile!

**Q: Can I export data after March 1?**

A: You can always export your current data. However, deprecated feature configurations (custom fields, filters, etc.) will no longer be accessible after March 1.

**Q: Will performance improve?**

A: Yes. Simple Mode is 3-5x faster in most workflows due to reduced complexity and optimized code.

### Team Questions

**Q: How do I communicate this to my team?**

A: We've prepared team announcement templates (see email templates below). Share the migration guide and schedule a 15-minute review session.

**Q: What if team members resist the change?**

A: Common concern! In beta testing, 87% of users preferred Simple Mode after 1 week of use. Encourage trying it for 5 days before judging.

**Q: Can different team members use different modes?**

A: No. Simple Mode is a workspace-wide change. This ensures consistency and prevents confusion.

**Q: Do we need retraining?**

A: Minimal. Simple Mode is more intuitive. Most teams are productive within minutes. We offer free 15-minute onboarding calls if needed.

### Billing Questions

**Q: Will pricing change?**

A: No. Your current plan and pricing remain the same.

**Q: Do I get a discount for losing features?**

A: Simple Mode includes new AI-powered features that provide more value. Pricing reflects the enhanced experience.

**Q: Can I downgrade if I don't like Simple Mode?**

A: We're confident you'll love it, but yes - standard cancellation policies apply. Try it for 30 days; we think you'll stay.

---

## Troubleshooting

### Export Issues

**Problem: Export file is too large**

Solution:
- Export by date range instead of "all time"
- Export feature-by-feature instead of full export
- Large exports are emailed instead of direct download

**Problem: Export failed or timed out**

Solution:
- Try during off-peak hours (early morning)
- Export smaller date ranges
- Contact support@foco.app for manual export

**Problem: Can't find exported files**

Solution:
- Check Downloads folder
- Check email for large export links
- Verify export completed: Settings > Export > History

### Migration Issues

**Problem: Can't find feature equivalent in Simple Mode**

Solution:
- Review this guide's feature mapping section
- Contact support with specific use case
- Join office hours Q&A sessions (Feb 1-28)

**Problem: Smart Inbox doesn't show my tasks**

Solution:
- Verify you're assigned to tasks
- Check filter settings (click filter icon)
- Ensure tasks have due dates or priority
- AI learns over time - give it 2-3 days

**Problem: Missing custom field data**

Solution:
- Export custom fields before March 1
- Add critical data to task descriptions
- Use labels for categorization

**Problem: Team members confused by new interface**

Solution:
- Share this migration guide
- Watch video tutorials together: help.foco.app/simple-mode
- Schedule 15-minute team walkthrough
- Request free onboarding call: support@foco.app

### Performance Issues

**Problem: Simple Mode feels slow**

Solution:
- Clear browser cache
- Update to latest browser version
- Check internet connection
- Contact support if issue persists

**Problem: Real-time updates not syncing**

Solution:
- Refresh browser
- Check network connection
- Verify permissions in project settings
- Report to support@foco.app

---

## Additional Resources

### Video Tutorials

- [Simple Mode Overview](https://help.foco.app/simple-mode-overview) (5 min)
- [Smart Inbox Deep Dive](https://help.foco.app/smart-inbox) (8 min)
- [Keyboard Shortcuts Masterclass](https://help.foco.app/keyboard-shortcuts) (6 min)
- [Team Migration Walkthrough](https://help.foco.app/team-migration) (12 min)

### Live Support

- **Office Hours**: Daily Q&A sessions (Feb 1-28, 2PM EST)
- **Email**: support@foco.app (response within 4 hours)
- **In-App Chat**: Click help icon in bottom right
- **Phone**: Available for Enterprise customers

### Community

- [Community Forum](https://community.foco.app)
- [Feature Requests](https://feedback.foco.app)
- [Blog](https://blog.foco.app) - Weekly Simple Mode tips
- [Twitter](https://twitter.com/focoapp) - Quick tips and updates

---

## Success Stories

> "We were skeptical at first, but Simple Mode cut our planning time from 2 hours to 30 minutes. The AI Smart Inbox is incredible."
> — Sarah Chen, Product Lead at TechCorp

> "Removing time tracking was the best decision. Our team focuses on shipping features, not logging hours. Productivity is up 25%."
> — Marcus Rodriguez, Engineering Manager at StartupXYZ

> "The migration took 20 minutes. Our team was fully productive the same day. Simpler is better."
> — Emily Watson, Operations Director at DesignStudio

---

**Need help?** We're here for you. Email support@foco.app or visit [help.foco.app](https://help.foco.app)

**Ready to migrate?** Start with the export checklist at the top of this guide.

Welcome to Simple Mode - where focus meets productivity.
