# Foco Copywriting Guide

**Voice:** Calm, direct, confident. No hype.

---

## Tone Principles

1. **Short sentences.** Get to the point.
2. **Plain language.** No jargon unless necessary.
3. **Active voice.** "You created a project" not "A project was created"
4. **Specific verbs.** "Create project" not "Submit"
5. **No emojis.** Let the UI speak.

---

## Button Labels

### Primary Actions

| ❌ Don't | ✅ Do |
|----------|-------|
| Submit | Create project |
| OK | Done |
| Save | Save changes |
| Confirm | Delete project |
| Yes | Continue |
| Go | Start |

### Patterns

- **Create:** "Create [thing]" - "Create project", "Create task"
- **Edit:** "Save changes" or "Update [thing]"
- **Delete:** "Delete [thing]" - "Delete project", "Remove member"
- **Cancel:** Just "Cancel" is fine
- **Close:** "Done" or "Close" for informational dialogs

---

## Empty States

### Formula

```
Title: [What this is] (3-5 words)
Description: [Why it matters] (1 sentence, <15 words)
Primary CTA: [What to do] (verb + noun)
Secondary: [Alternative path] (optional)
```

### Examples

**Projects (no projects)**
```
Title: Start your first project
Description: Projects organize tasks, docs, and team conversations in one place.
CTA: Create project
Secondary: Import from CSV
```

**Inbox (empty)**
```
Title: You're all caught up
Description: Mentions, assignments, and approvals will show up here.
CTA: Go to My Work
```

**Search (no results)**
```
Title: No results for "[query]"
Description: Try a different search term or check your filters.
CTA: Clear search
```

**Tasks (section empty)**
```
Now section:
Title: Your focus list is clear
Description: Add tasks you want to tackle today.
CTA: Add task

Next section:
Title: Nothing queued up
Description: Move tasks here when you're ready to work on them soon.
CTA: Add task
```

**People (search empty)**
```
Title: No one matches "[query]"
Description: Try a different name or check the spelling.
CTA: Clear search
```

**Milestones (none)**
```
Title: No milestones yet
Description: Milestones mark important dates and deliverables.
CTA: Create milestone
```

---

## Error Messages

### Formula

```
What happened + What to do next
```

### Examples

| Context | Message |
|---------|---------|
| Network error | "Couldn't connect. Check your internet and try again." |
| Not found | "This project doesn't exist or you don't have access." |
| Permission denied | "You don't have permission to edit this. Ask the owner for access." |
| Validation | "Project name is required." |
| Server error | "Something went wrong on our end. Try again in a moment." |
| Rate limit | "Too many requests. Wait a few seconds and try again." |

### Rules

- Don't blame the user
- Don't be vague ("An error occurred")
- Always offer a next step
- Use contractions ("couldn't" not "could not")

---

## Toast Messages

### Success

```
✓ Project created
✓ Changes saved
✓ Member invited
✓ Task marked done. Undo
```

### With Undo

```
✓ Task archived. Undo
✓ Project deleted. Undo (5s)
```

### Error

```
✗ Couldn't save changes. Try again.
✗ Failed to send invite. Check the email address.
```

### Info

```
ℹ Syncing changes...
ℹ 3 tasks imported
```

---

## Form Labels & Help Text

### Labels

- Sentence case: "Project name" not "Project Name"
- No colons: "Project name" not "Project name:"
- Be specific: "Due date" not "Date"

### Placeholder Text

Use sparingly. Don't repeat the label.

| Label | ❌ Placeholder | ✅ Placeholder |
|-------|---------------|----------------|
| Project name | Project name | Website redesign |
| Email | Enter email | you@company.com |
| Description | Enter description | What's this project about? |

### Help Text

Below the field, in muted text.

```
Due date
[Date picker]
When should this be complete?
```

```
Description
[Textarea]
Optional. A few sentences about what you're building.
```

---

## Dialogs

### Titles

- Short and specific
- Action-oriented when possible

| ❌ Don't | ✅ Do |
|----------|-------|
| New Project | Create project |
| Edit | Edit project |
| Confirmation | Delete project? |
| Warning | Unsaved changes |

### Descriptions

One sentence explaining what will happen.

```
Delete project?
This will permanently delete "Website Redesign" and all its tasks. This can't be undone.
[Cancel] [Delete project]
```

```
Unsaved changes
You have unsaved changes that will be lost.
[Discard changes] [Keep editing]
```

---

## Navigation & Menus

### Menu Items

- Verb + noun when it's an action
- Just noun when it's navigation

| Type | Example |
|------|---------|
| Navigation | Projects, Settings, Reports |
| Action | Create project, Invite member |
| Toggle | Mark as done, Pin to sidebar |
| Destructive | Delete, Remove from team |

### Keyboard Shortcuts

Show in menu items and tooltips.

```
Create project    ⌘P
Search            ⌘K
Mark done         E
Snooze            S
```

---

## Onboarding

### Welcome

```
Welcome to Foco
Let's set up your workspace in about 2 minutes.
[Get started]
```

### Progress

```
Step 1 of 4: Create your first project
Give your project a name. You can always change it later.
```

### Completion

```
You're all set!
Your workspace is ready. Here's what you can do next:
- Create your first task
- Invite your team
- Explore the dashboard
[Go to dashboard]
```

---

## AI-Related Copy

### AI Suggestions

```
🔮 AI suggestion
"Break this into 3 subtasks: Design, Develop, Test"
[Apply] [Dismiss]
```

### AI Attribution

```
Generated by Foco AI • Based on 47 task updates this week
[Show sources]
```

### AI Actions

```
Suggest assignee
Break into subtasks
Estimate time
Generate status update
```

### Confidence Indicators

```
92% confident • [Apply] [Edit first]
```

---

## Accessibility Labels

### Screen Reader Text

```tsx
// Button with icon only
<Button aria-label="Create project">
  <Plus />
</Button>

// Status indicator
<span className="sr-only">Status: In progress</span>

// Loading
<span aria-live="polite">Loading projects...</span>
```

### Skip Links

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## Word List

### Preferred Terms

| Use | Don't Use |
|-----|-----------|
| project | workspace, board |
| task | item, card, ticket |
| member | user, person |
| team | organization, workspace |
| due date | deadline |
| done | completed, finished |
| blocked | stuck |
| assignee | owner, responsible |

### Capitalization

- Product name: Foco (capital F)
- Feature names: lowercase (projects, inbox, my work)
- Page titles: Sentence case (My work, not My Work)

---

*When in doubt, read it out loud. If it sounds natural, it's probably right.*
