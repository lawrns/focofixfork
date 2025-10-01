# AI-Powered Project Management Walkthrough - Foco.mx

## Complete Testing Walkthrough for Browsing AI

**Instructions**: Use this prompt with a browsing AI (like Claude with web access, GPT-4 with browsing, etc.) to test the complete Foco project management system end-to-end.

---

## Walkthrough Prompt

Go to https://foco.mx, login with laurence@fyves.com / Hennie@@12 and go through the following steps to test the AI-powered project management system:

### 1. Login and Dashboard
- After logging in, you should see the main dashboard
- Look for three view tabs: **Table**, **Kanban**, and **Gantt**
- Verify you see a "**Create with AI**" button with a sparkles icon
- Take a screenshot of the dashboard

### 2. Test AI Project Creation
- Click the "**Create with AI**" button
- You should see a modal dialog with:
  - An organization dropdown (select any available organization)
  - A large textarea for project specification
  - 4 example specifications you can click to use

- Click on the first example specification OR paste this:
  ```
  Build a customer feedback portal with user authentication, feedback submission forms, admin moderation dashboard, and analytics. Include email notifications and export features. Timeline: 3 months, team of 3 developers, moderate complexity.
  ```

- Click "**Create with AI**" button

**⚠️ IMPORTANT - First Deployment Note:**
- If this is the first time using AI features (or within 10 minutes of deployment), you may see:
  ```
  ⏳ AI models are still loading. Please try again in a few minutes.
  ℹ️  The AI service is downloading required models. This may take 5-10 minutes on first deployment.
  ```
- This is **expected behavior** - the Ollama AI models (3.8GB each) are downloading in the background
- Wait 5-10 minutes and try again
- To check if models are ready: `curl https://foco-ollama.fly.dev/api/tags`
  - Returns `{"models": []}` → still loading
  - Returns models array → ready to use

**When Models Are Ready:**
- Click "**Create with AI**" button
- **IMPORTANT**: This will take 10-30 seconds as the AI processes your request
- Watch for:
  - Loading spinner with "AI is working on your project..." message
  - Progress indicators (✓ Analyzing specification, ✓ Breaking down into milestones, ⏳ Generating tasks...)
  - Success alert showing project name, milestone count, and task count

- The system should automatically create:
  - 1 project with a descriptive name
  - 5-7 logical milestones
  - 25-40 tasks distributed across milestones
  - Appropriate priorities and deadlines

- Take a screenshot of the success message
- You should be redirected to the project detail page

### 3. Verify Project Structure
- On the project detail page, verify:
  - Project name matches your specification
  - Project has multiple milestones listed
  - Each milestone has multiple tasks
  - Tasks have status badges (To Do, In Progress, etc.)
  - Tasks have priority indicators (colored dots)

### 4. Test Kanban Board
- Go back to the dashboard (click "Dashboard" in sidebar)
- Click the "**Kanban**" tab
- You should see 4 columns:
  - To Do
  - In Progress
  - Review
  - Done

- **Test drag-and-drop**:
  - Try dragging a task from "To Do" to "In Progress"
  - The task should move smoothly
  - The status should update in real-time
  - Take a screenshot of the Kanban board

### 5. Test Table View
- Click the "**Table**" tab
- You should see a data table with all projects
- Verify columns: Name, Status, Priority, Due Date, Progress
- Check that your AI-created project appears in the list
- Take a screenshot of the table view

### 6. Test Project List
- Navigate to "Projects" in the sidebar
- You should see all projects as cards
- Look for:
  - Project cards with name, description, status badge
  - Progress bars showing completion percentage
  - Action buttons (Edit, Delete, Settings)
  - Your AI-created project should be visible
- Take a screenshot

### 7. Test Traditional Project Creation
- Click "New Project" or "+" button
- Fill in the form manually:
  - Project Name: "Manual Test Project"
  - Description: "Testing traditional creation"
  - Organization: (select any)
  - Due Date: (pick a future date)
- Click "Create Project"
- Verify the project is created successfully

### 8. Test Goals/Analytics (if available)
- Navigate to "Goals" or "Analytics" in the sidebar
- Check for any visualizations or metrics
- Take a screenshot if data is available

### 9. Test Settings
- Navigate to "Settings" in the sidebar
- Check available configuration options
- Verify user profile information is displayed
- Take a screenshot

### 10. Test Search (if available)
- Look for a search bar in the header
- Try searching for your AI-created project name
- Verify search results appear correctly

---

## Expected Results Summary

After completing this walkthrough, you should have verified:

✅ **Login**: Successful authentication
✅ **AI Project Creation**: 10-30 second process creates full project structure
✅ **Project Structure**: 1 project + 5-7 milestones + 25-40 tasks
✅ **Kanban Board**: Drag-and-drop working, 4 columns visible
✅ **Table View**: All projects listed with proper columns
✅ **Traditional Creation**: Manual project creation working
✅ **Navigation**: All sidebar links functional

---

## Troubleshooting

### If AI Project Creation Fails:
- Check browser console (F12) for errors
- Look for error messages in the modal
- Verify you selected an organization
- Check that specification has at least 10 characters

### If Models Not Available Error:
- This means Ollama models are still downloading on the server
- Wait 5-10 minutes and try again
- The system will show "AI models not yet available" error

### If 400 Error Appears:
- Check that you filled in the organization field
- Verify the specification text is valid
- Try using one of the example specifications

### If Rate Limited (429 Error):
- You've exceeded the rate limit (10 requests per 5 minutes)
- Wait a few minutes before trying again
- Error will show "Rate limit exceeded" with retry-after time

---

## Screenshots to Capture

Please capture screenshots of:
1. Dashboard main view with all three tabs visible
2. AI Project Creator modal with example specifications
3. AI creation success message showing milestone/task counts
4. Kanban board with 4 columns and draggable tasks
5. Table view showing all projects
6. Project detail page showing generated milestones and tasks

---

## Technical Details to Note

- **API Endpoint**: https://foco.mx/api/ollama/create-project
- **AI Service**: Ollama running at https://foco-ollama.fly.dev
- **Model**: llama2 (7B parameters)
- **Expected Processing Time**: 10-30 seconds
- **Rate Limit**: 10 AI requests per 5 minutes per user
- **Max Specification Length**: No hard limit, but 100-500 words recommended

---

## Advanced Testing (Optional)

### Test Structured Specification
Try creating a project with this structured JSON-like specification:
```
Create an E-commerce Platform with:
- Product catalog with categories and search
- Shopping cart with session persistence
- Payment integration (Stripe)
- Order management and tracking
- Admin dashboard with analytics
- User authentication and profiles
- Email notifications for orders

Timeline: 6 months
Team size: 5 developers
Complexity: complex
Domain: E-commerce
```

This should generate a more detailed project structure with appropriate milestones for each major feature.

### Test Update Commands (if implemented)
After creating a project, try using natural language to update it:
- "Change status to active"
- "Set priority to high"
- "Update due date to end of year"

### Test Milestone/Task Creation (if implemented)
Try adding individual components:
- Create a new milestone: "Add security audit milestone for end of project"
- Create a new task: "Implement rate limiting on API endpoints, estimate 4 hours"

---

## Success Criteria

The walkthrough is successful if:
- ✅ AI creates a project in under 30 seconds
- ✅ Generated project has logical structure (3-7 milestones, 20+ tasks)
- ✅ Milestones have appropriate deadlines
- ✅ Tasks have priorities and descriptions
- ✅ Kanban board is functional
- ✅ All navigation works without errors
- ✅ No console errors in browser developer tools

---

## Report Back

Please report:
1. **Overall Experience**: How smooth was the AI project creation?
2. **Performance**: How long did AI generation take?
3. **Quality**: Were the generated milestones and tasks logical and well-structured?
4. **Issues**: Any errors, bugs, or confusing UX elements?
5. **Suggestions**: Ideas for improvement?

---

**End of Walkthrough**

Thank you for testing the Foco AI-powered project management system!
