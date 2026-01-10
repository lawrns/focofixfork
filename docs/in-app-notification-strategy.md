# In-App Notification Strategy - Simple Mode Migration

## Overview

This document outlines the in-app notification and education strategy for migrating users from complex features to Simple Mode. The goal is to guide users smoothly without overwhelming them.

## Guiding Principles

1. **Progressive Disclosure**: Show information when relevant, not all at once
2. **Contextual Help**: Guide users at the moment they need it
3. **Benefit-Focused**: Emphasize improvements, not losses
4. **Non-Intrusive**: Allow dismissal, don't block workflows
5. **Action-Oriented**: Always provide clear next steps

---

## Notification Types

### 1. Top Banner Announcement

**When**: First login after February 1, 2026
**Duration**: Persistent until March 1 or user dismisses
**Dismissible**: Yes (returns once per week)

**Design**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🎉 Foco is getting simpler! Simple Mode launches March 1.   │
│ Export your data now | Learn more | Try beta | Dismiss      │
└─────────────────────────────────────────────────────────────┘
```

**Content**:
```
Foco is getting simpler (and better)

Simple Mode launches March 1. We're removing complexity and
adding AI-powered workflows. Export your data now to preserve
historical configurations.

[Export Data] [Read Migration Guide] [Enable Beta] [Dismiss]
```

**Actions**:
- **Export Data**: Opens Settings > Export
- **Read Migration Guide**: Opens migration guide in help center
- **Enable Beta**: Toggles Simple Mode preview
- **Dismiss**: Hides for 7 days

**Behavior**:
- Shows on every page until dismissed
- Countdown timer: "X days until Simple Mode"
- Changes urgency color as deadline approaches:
  - 14+ days: Blue (informational)
  - 7-13 days: Yellow (reminder)
  - 1-6 days: Orange (urgent)

---

### 2. Feature-Specific Tooltips

**When**: User visits deprecated feature page
**Duration**: Shows 3 times, then stops
**Dismissible**: Yes

#### Gantt Chart Page

**Tooltip Position**: Top of page, below main navigation

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Heads up: Gantt charts are being replaced with Calendar  │
│ view on March 1. Calendar view offers the same timeline     │
│ visualization with better performance.                       │
│                                                              │
│ [Try Calendar View] [Export This Chart] [Learn More]        │
└─────────────────────────────────────────────────────────────┘
```

**Content**:
- **Headline**: Feature name + replacement
- **Benefit**: Why the new way is better
- **Actions**: Try alternative, export data, learn more

**Actions**:
- **Try Calendar View**: Switches to calendar view with current data
- **Export This Chart**: Exports current Gantt chart as CSV
- **Learn More**: Opens migration guide section for Gantt charts

#### Custom Fields Page

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Custom fields are becoming automatic! Starting March 1,  │
│ AI will extract metadata from your task descriptions.       │
│ No more forms to fill out.                                  │
│                                                              │
│ [See How It Works] [Export Field Definitions] [Learn More]  │
└─────────────────────────────────────────────────────────────┘
```

#### Time Tracking Page

```
┌─────────────────────────────────────────────────────────────┐
│ ⏱️ Time tracking is being retired on March 1. We're         │
│ focusing on task completion instead of hours logged.        │
│                                                              │
│ Export your time data | See recommended integrations        │
│ [Export All Time Data] [View Integrations] [Learn More]     │
└─────────────────────────────────────────────────────────────┘
```

#### Advanced Filters Page

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Advanced filters are being replaced with Smart Inbox     │
│ on March 1. AI automatically surfaces what needs your       │
│ attention - no configuration required.                      │
│                                                              │
│ [Try Smart Inbox] [Export Filter Definitions] [Learn More]  │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Interactive Feature Tour

**When**: User enables Simple Mode beta OR after March 1 launch
**Duration**: One-time (can replay from help menu)
**Dismissible**: Yes (skip tour)

**Tour Steps**:

#### Step 1: Welcome
```
┌─────────────────────────────────────────────────────────────┐
│                   Welcome to Simple Mode                     │
│                                                              │
│  Foco is now streamlined to help you focus on what matters. │
│  Let's take a 60-second tour of what's new.                 │
│                                                              │
│  [Start Tour] [Skip Tour]                           Step 1/5 │
└─────────────────────────────────────────────────────────────┘
```

#### Step 2: Smart Inbox (Highlight Smart Inbox)
```
┌─────────────────────────────────────────────────────────────┐
│                      Smart Inbox                             │
│                                                              │
│  AI automatically surfaces your most important tasks.       │
│  No more manual filtering - just check here daily.          │
│                                                              │
│  [Next] [Skip Tour]                                 Step 2/5 │
└─────────────────────────────────────────────────────────────┘
```

#### Step 3: Simple Kanban (Highlight Board View)
```
┌─────────────────────────────────────────────────────────────┐
│                    One Simple Board                          │
│                                                              │
│  Drag tasks through: To Do → In Progress → Done             │
│  Clean design. Real-time collaboration. Mobile-optimized.   │
│                                                              │
│  [Next] [Skip Tour]                                 Step 3/5 │
└─────────────────────────────────────────────────────────────┘
```

#### Step 4: Quick Task Creation (Highlight New Task Button)
```
┌─────────────────────────────────────────────────────────────┐
│                  3x Faster Task Creation                     │
│                                                              │
│  Press 'n' or click + to create a task                      │
│  Just type naturally - AI extracts metadata automatically   │
│                                                              │
│  [Next] [Skip Tour]                                 Step 4/5 │
└─────────────────────────────────────────────────────────────┘
```

#### Step 5: Keyboard Shortcuts (Show shortcut overlay)
```
┌─────────────────────────────────────────────────────────────┐
│                  Keyboard-First Workflows                    │
│                                                              │
│  n         - New task                                        │
│  /         - Search                                          │
│  Cmd+Enter - Mark complete                                  │
│  ↑/↓       - Navigate                                        │
│                                                              │
│  [Finish Tour] [View All Shortcuts]             Step 5/5     │
└─────────────────────────────────────────────────────────────┘
```

**Tour Behavior**:
- Modal overlay with spotlight on highlighted feature
- User can click outside to dismiss
- Progress indicator (Step X/5)
- Can replay from Help > Simple Mode Tour

---

### 4. Contextual Help Popovers

**When**: User hovers over new UI elements
**Duration**: Shows for first 7 days, then stops
**Dismissible**: Yes (per popover)

#### Smart Inbox Icon
```
  [Inbox Icon with blue dot]
    ↓
  ┌─────────────────────────────┐
  │ New: Smart Inbox            │
  │ AI surfaces what needs      │
  │ your attention today        │
  │                             │
  │ [Try It] [Don't show again] │
  └─────────────────────────────┘
```

#### Quick Task Button
```
  [+ Button]
    ↓
  ┌─────────────────────────────┐
  │ 3x faster now!              │
  │ No custom fields to fill.   │
  │ Just type naturally.        │
  │                             │
  │ Tip: Press 'n' as shortcut  │
  │ [Got it]                    │
  └─────────────────────────────┘
```

#### Keyboard Shortcut Hint
```
  [Search Bar]
    ↓
  ┌─────────────────────────────┐
  │ Press / to search anywhere  │
  │ Works across all projects   │
  │                             │
  │ [View all shortcuts]        │
  └─────────────────────────────┘
```

---

### 5. Empty State Messages

**When**: User navigates to removed feature page (after March 1)
**Duration**: Permanent
**Dismissible**: No (educational)

#### Gantt Chart Empty State

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    📅                                        │
│                                                              │
│              Gantt charts have moved                         │
│                                                              │
│  Timeline visualization is now available in Calendar view.   │
│  It's faster, mobile-friendly, and easier to use.           │
│                                                              │
│  [Open Calendar View]  [Learn about Simple Mode]            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Custom Fields Empty State

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    🤖                                        │
│                                                              │
│            Custom fields are now automatic                   │
│                                                              │
│  AI extracts metadata from your task descriptions.          │
│  Example: "Design homepage (urgent, mobile)" automatically  │
│  detects priority: urgent, platform: mobile                 │
│                                                              │
│  [Create a Task]  [See How It Works]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Time Tracking Empty State

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    ⏱️                                        │
│                                                              │
│         Time tracking has been retired                       │
│                                                              │
│  Foco now focuses on task completion instead of hours       │
│  logged. For time tracking, we recommend:                   │
│                                                              │
│  • Toggl (seamless integration)                             │
│  • Harvest (for client billing)                             │
│  • Clockify (free option)                                   │
│                                                              │
│  [View Integrations]  [Export Historical Data]              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Success Notifications

**When**: User completes key Simple Mode actions
**Duration**: 5 seconds or until dismissed
**Dismissible**: Yes

#### First Task Created in Simple Mode

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Task created! Notice how much faster that was?           │
│ No custom fields, no forms - just create and go.            │
│                                                              │
│ [Dismiss]                                                    │
└─────────────────────────────────────────────────────────────┘
```

#### First Visit to Smart Inbox

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Welcome to Smart Inbox! These are your most important    │
│ tasks today. Check here daily instead of scanning projects. │
│                                                              │
│ [Got it]                                                     │
└─────────────────────────────────────────────────────────────┘
```

#### First Keyboard Shortcut Used

```
┌─────────────────────────────────────────────────────────────┐
│ 🚀 Nice! You just used a keyboard shortcut.                 │
│ Press ? to see all shortcuts and work even faster.          │
│                                                              │
│ [View Shortcuts] [Dismiss]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Timeline & Phasing

### Phase 1: Announcement (Feb 1-7, 2026)

**Goal**: Awareness and initial education

**Notifications Active**:
- Top banner announcement (blue, informational)
- Feature-specific tooltips (first appearance)
- Beta opt-in promotion

**Frequency**:
- Banner: Persistent until dismissed
- Tooltips: Once per feature visit
- Email: One announcement email

### Phase 2: Preparation (Feb 8-21, 2026)

**Goal**: Data export and exploration

**Notifications Active**:
- Top banner (yellow, reminder tone)
- Feature-specific tooltips (up to 3 times)
- Export success confirmations
- Beta mode tour (if opted in)

**Frequency**:
- Banner: Returns weekly if dismissed
- Tooltips: Max 3 times per feature
- Email: Export reminder on Feb 15

### Phase 3: Urgency (Feb 22-28, 2026)

**Goal**: Final exports and readiness

**Notifications Active**:
- Top banner (orange, urgent tone)
- Feature-specific tooltips (final reminder)
- Export deadline warnings
- Beta mode promotion (last chance to try)

**Frequency**:
- Banner: Persistent, more prominent
- Tooltips: Final appearance
- Email: Final reminder on Feb 22

### Phase 4: Launch (March 1, 2026)

**Goal**: Welcome and onboarding

**Notifications Active**:
- Welcome modal (one-time)
- Interactive feature tour
- Contextual help popovers
- Success notifications
- Empty state messages

**Frequency**:
- Tour: One-time (can replay)
- Popovers: First 7 days
- Success: Per action
- Email: Welcome email

### Phase 5: Reinforcement (March 2-15, 2026)

**Goal**: Adoption and mastery

**Notifications Active**:
- Contextual help popovers (fading out)
- Success notifications
- Keyboard shortcut hints
- Feature discovery prompts

**Frequency**:
- Gradually reducing
- Focus on unused features
- Celebrate milestones

---

## Notification Content Matrix

### Message Components

Every notification should include:

1. **Emoji/Icon**: Visual anchor for quick recognition
2. **Headline**: Clear, benefit-focused statement
3. **Explanation**: 1-2 sentences of context
4. **Actions**: Clear next steps (1-3 buttons)
5. **Dismissal**: Always allow users to close

### Tone Guidelines

**Positive, Empowering Language**:
- ✅ "You're getting faster workflows"
- ❌ "We're removing features"

**Benefit-First**:
- ✅ "AI now does this automatically"
- ❌ "Custom fields are deprecated"

**Action-Oriented**:
- ✅ "Try Smart Inbox now"
- ❌ "Smart Inbox is available"

**Not Apologetic**:
- ✅ "We're making Foco simpler and better"
- ❌ "Sorry for the inconvenience"

---

## User Segmentation

### New Users (Joined after Feb 1, 2026)

**Notifications**:
- No migration messaging
- Standard Simple Mode onboarding
- Feature tour emphasizing benefits

**Reasoning**: They never knew the old features, so no need to explain what's changing.

### Light Users (< 10 tasks/month)

**Notifications**:
- Minimal migration messaging
- Focus on benefits and simplification
- Single email announcement

**Reasoning**: They're not heavily invested in old workflows, so lighter touch works better.

### Active Users (10-100 tasks/month)

**Notifications**:
- Standard migration flow
- Feature tooltips on deprecated pages
- Export reminders
- Full feature tour

**Reasoning**: Need clear guidance but not overwhelming detail.

### Power Users (> 100 tasks/month)

**Notifications**:
- Enhanced migration support
- Proactive export assistance
- Direct email from customer success
- Optional migration call
- Extended tour with advanced tips

**Reasoning**: Higher change impact requires more support.

### Teams/Enterprise

**Notifications**:
- Admin-specific dashboard
- Team-wide announcement templates
- Bulk export tools
- Dedicated migration specialist
- Custom timeline options

**Reasoning**: Coordination across team members requires admin controls.

---

## Technical Implementation

### Notification State Management

**Local Storage Keys**:
```javascript
{
  "foco.migration.banner.dismissed": "2026-02-01T10:30:00Z",
  "foco.migration.tour.completed": true,
  "foco.migration.tooltips.gantt": 2,  // view count
  "foco.migration.tooltips.customFields": 1,
  "foco.migration.exportCompleted": true,
  "foco.simpleMode.firstTaskCreated": "2026-03-01T14:22:00Z"
}
```

**Server-Side Tracking**:
```javascript
{
  user_id: "uuid",
  migration_events: [
    { event: "banner_viewed", timestamp: "2026-02-01T10:00:00Z" },
    { event: "migration_guide_opened", timestamp: "2026-02-01T10:15:00Z" },
    { event: "data_exported", export_type: "full", timestamp: "2026-02-05T09:30:00Z" },
    { event: "beta_enabled", timestamp: "2026-02-10T11:00:00Z" },
    { event: "tour_completed", timestamp: "2026-02-10T11:10:00Z" }
  ]
}
```

### Notification Components (React)

**Banner Component**:
```typescript
<MigrationBanner
  variant="info" | "warning" | "urgent"
  daysUntilLaunch={number}
  onDismiss={() => void}
  onExportClick={() => void}
  onLearnMoreClick={() => void}
  onTryBetaClick={() => void}
/>
```

**Feature Tooltip Component**:
```typescript
<FeatureDeprecationTooltip
  featureName={string}
  replacement={string}
  benefits={string[]}
  viewCount={number}
  maxViews={3}
  onTryAlternative={() => void}
  onExport={() => void}
  onLearnMore={() => void}
/>
```

**Tour Component**:
```typescript
<SimpleModeOnboarding
  steps={TourStep[]}
  currentStep={number}
  onNext={() => void}
  onSkip={() => void}
  onComplete={() => void}
/>
```

### Analytics Tracking

**Events to Track**:
- `migration_banner_viewed`
- `migration_banner_dismissed`
- `export_button_clicked`
- `migration_guide_opened`
- `beta_mode_enabled`
- `tour_started`
- `tour_completed`
- `tour_skipped`
- `feature_tooltip_viewed`
- `alternative_feature_clicked`
- `first_simple_mode_task_created`
- `keyboard_shortcut_used`

**Metrics to Monitor**:
- Export completion rate
- Beta adoption rate
- Tour completion rate
- Time to first Simple Mode action
- Feature discovery rate
- Support ticket volume by topic
- User sentiment (feedback scores)

---

## A/B Testing Strategy

### Test 1: Banner Urgency

**Variants**:
- A: Informational tone (blue) throughout
- B: Progressive urgency (blue → yellow → orange)

**Hypothesis**: Progressive urgency increases export completion without causing anxiety.

**Metric**: Export completion rate before deadline

### Test 2: Tour Timing

**Variants**:
- A: Automatic tour on first login after launch
- B: Opt-in tour with banner promotion
- C: No tour, contextual popovers only

**Hypothesis**: Opt-in tour has higher completion and satisfaction.

**Metric**: Tour completion rate, 7-day retention

### Test 3: Tooltip Frequency

**Variants**:
- A: Show 3 times per feature
- B: Show 5 times per feature
- C: Show until manually dismissed

**Hypothesis**: 3 times is optimal (not annoying, sufficient education).

**Metric**: Feature adoption rate, tooltip dismiss rate

---

## Success Metrics

### Migration Success

**Export Metrics**:
- Export completion rate: > 60% of active users
- Export timing: > 80% before Feb 28 deadline
- Export support tickets: < 5% of users

**Education Metrics**:
- Migration guide views: > 40% of active users
- Video tutorial views: > 20% of active users
- Office hours attendance: > 100 users total

**Adoption Metrics**:
- Beta mode adoption: > 30% before launch
- Tour completion: > 50% of users
- First Simple Mode task: < 2 minutes from login

### Post-Launch Success

**Feature Adoption** (Week 1):
- Smart Inbox usage: > 70% of active users
- Keyboard shortcuts: > 30% of users try one
- Calendar view adoption: > 50% of Gantt users

**User Satisfaction**:
- Net Promoter Score: > 40
- Feature satisfaction: > 4.0/5
- Support ticket sentiment: > 80% positive

**Business Metrics**:
- 7-day retention: > 85% (vs 80% baseline)
- 30-day retention: > 75% (vs 70% baseline)
- Task creation velocity: +20% increase
- Time to task creation: -60% decrease

---

## Rollback Plan

### If Migration Causes Issues

**Trigger Conditions**:
- 7-day retention drops below 70%
- Support tickets exceed 2x normal volume
- Critical bug affecting > 10% of users
- User sentiment below 3.0/5

**Rollback Options**:

1. **Feature Rollback** (Low risk)
   - Re-enable specific deprecated feature
   - Maintain Simple Mode as option
   - Give users choice

2. **Full Rollback** (High risk)
   - Restore all deprecated features
   - Make Simple Mode opt-in only
   - Extended migration timeline

3. **Hybrid Approach** (Recommended)
   - Simple Mode default for new users
   - Legacy mode available for existing users
   - Gradual migration over 90 days

---

## Appendix: Copy Bank

### Headlines

- "Foco is getting simpler"
- "Welcome to Simple Mode"
- "Work faster with less complexity"
- "AI-powered workflows are here"
- "Focus on what matters"

### Benefits

- "3x faster task creation"
- "60% less time in settings"
- "AI does the heavy lifting"
- "Cleaner, more intuitive interface"
- "Mobile-optimized design"

### CTAs

- "Try it now"
- "Learn more"
- "Export your data"
- "Start tour"
- "See how it works"

### Reassurance

- "Your data is safe"
- "All tasks and projects preserved"
- "Easy to learn, faster to use"
- "We're here to help"
- "Nothing changes until March 1"

---

**End of In-App Notification Strategy**

This strategy balances user education with minimal disruption, using progressive disclosure and contextual help to guide users smoothly into Simple Mode.
