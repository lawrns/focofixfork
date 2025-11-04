# 🎯 Voice Planning Features Testing Checklist

## 🔐 **Login Test**
- [ ] Navigate to `localhost:3001`
- [ ] Click login button
- [ ] Enter email: `laurence@fyves.com`
- [ ] Enter password: `hennie12`
- [ ] Verify successful authentication and redirect to dashboard

## 🏠 **Homepage Voice Planning Showcase**
- [ ] Navigate to homepage (`localhost:3001`)
- [ ] **Visual Verification:**
  - [ ] Voice Planning Workbench section is visible
  - [ ] Three component preview cards (Voice Capture, Plan Review, Timeline View)
  - [ ] Audio visualizer bars are animated
  - [ ] Intent chips display (10 weeks, 2 devs, iOS)
  - [ ] Quality Gates metrics with progress bars
- [ ] **Interactive Test:**
  - [ ] Click "Experience Voice Planning Workbench" button
  - [ ] Verify redirect to `/voice` page

## 🎤 **Voice Planning Workbench - `/voice` Page**

### **Header & Navigation**
- [ ] Verify Foco Voice Planning header with brain icon
- [ ] Check "Speak &apos;your roadmap. Ship &apos;your future." subtitle
- [ ] Test navigation buttons (Search, Settings, New Project)
- [ ] Verify sidebar quick nav with "Voice → Plan (Beta)" highlighted

### **Live Metrics Sidebar**
- [ ] Check "Latency p95 ~5.1s" badge
- [ ] Verify "Draft accept rate 72%" badge
- [ ] Confirm "Voice sessions today 38" badge

### **Voice Tab (Default)**
- [ ] **Voice Capture Panel:**
  - [ ] "Voice → Plan" title with sparkles icon
  - [ ] Description text about parsing intents
  - [ ] **Recording Button Test:**
    - [ ] Click "Hold to Talk (demo)" button
    - [ ] Verify button changes to "Stop Recording" with red gradient
    - [ ] Check toast notification: "Recording started (demo)"
    - [ ] Click again to stop recording
    - [ ] Verify toast: "Recording stopped"
  - [ ] **Generate Draft Button:**
    - [ ] Click "Generate Draft" button
    - [ ] Verify automatic tab switch to "Review" tab
    - [ ] Check toast: "Plan draft generated"
- [ ] **Transcript Area:**
  - [ ] Verify demo text: "We need a mobile task manager with auth, offline sync, and a dashboard..."
  - [ ] Test editing the transcript text
  - [ ] **Audio Visualizer:**
    - [ ] Verify animated bars when recording
    - [ ] Check signal strength indicator
- [ ] **Intent Chips:**
  - [ ] Verify chips: "10 weeks" (blue), "2 devs" (amber), "Auth" (violet), "Offline sync" (violet), "Dashboard" (violet), "iOS" (purple)
- [ ] **Quality Gates:**
  - [ ] Transcription confidence: 78% (progress bar)
  - [ ] Intent extraction: 85% (progress bar)
  - [ ] Planning latency: 62% (progress bar)

### **Review Tab (After Plan Generation)**
- [ ] **Project Header:**
  - [ ] Title: "Mobile Task Manager Beta"
  - [ ] Description about voice-generated plan
  - [ ] Action buttons: "Save Draft" and "Commit Plan"
- [ ] **Milestone Cards:**
  - [ ] **Auth & Accounts** milestone:
    - [ ] 3/0 tasks done indicator
    - [ ] Task: "Email + Password" (high priority, 16h)
    - [ ] Task: "OAuth (Apple/Google)" (medium priority, 20h)
    - [ ] Test drag handles on tasks
    - [ ] Test checkbox to mark task as done
    - [ ] Verify priority badge colors
  - [ ] **Offline Sync** milestone:
    - [ ] 3 tasks with different priorities
    - [ ] Test task reordering via drag-and-drop
  - [ ] **Dashboard** milestone:
    - [ ] 3 tasks related to metrics and charts
  - [ ] **QA & Beta Launch** milestone:
    - [ ] 4 tasks for testing and launch
- [ ] **Task Actions:**
  - [ ] Test "Add task" button functionality
  - [ ] Test "Link dependency" button
- [ ] **Risks & Assumptions Section:**
  - [ ] Verify risks: "Offline data consistency on iOS"
  - [ ] Verify assumptions: "Two devs, one designer", "Target 10 weeks"

### **Timeline Tab**
- [ ] **Timeline Visualization:**
  - [ ] Verify bar chart with milestone durations
  - [ ] Check colored bars: violet, blue, emerald, cyan, lime
  - [ ] Test hover tooltips on bars
  - [ ] Verify "Demo estimate" badge
  - [ ] Check axis labels and grid

## 📱 **Mobile Navigation Test**
- [ ] Resize browser to mobile width
- [ ] Verify mobile bottom navigation appears
- [ ] Check "Voice Planning" item with mic icon
- [ ] Test navigation to voice page from mobile nav

## 🎛️ **Dashboard Integration Test**
- [ ] Navigate to `/dashboard/personalized`
- [ ] **Quick Actions Widget:**
  - [ ] Verify "Voice Planning" action with mic icon
  - [ ] Check gradient styling (violet to purple)
  - [ ] Click "Voice Planning" button
  - [ ] Verify redirect to `/voice` page

## 🔄 **Cross-Feature Integration**
- [ ] Test navigation between dashboard → voice → dashboard
- [ ] Verify browser back/forward functionality
- [ ] Test direct URL access to `/voice`
- [ ] Check authentication protection (try accessing `/voice` while logged out)

## 🎨 **Design & Responsive Testing**
- [ ] **Desktop (1920x1080):**
  - [ ] Verify proper layout with sidebar
  - [ ] Check hover states on all interactive elements
  - [ ] Test animations and transitions
- [ ] **Tablet (768x1024):**
  - [ ] Verify responsive grid layouts
  - [ ] Check component stacking behavior
- [ ] **Mobile (375x667):**
  - [ ] Verify mobile-optimized layouts
  - [ ] Test touch targets (minimum 44px)
  - [ ] Check scroll behavior

## ⚡ **Performance & Loading**
- [ ] Test page load speed for voice planning
- [ ] Verify smooth animations during recording
- [ ] Check drag-and-drop performance
- [ ] Test chart rendering speed

## 🔔 **Toast Notifications Test**
- [ ] Recording start/stop notifications
- [ ] Plan generation success
- [ ] Save draft confirmation
- [ ] Commit plan success

## 🐛 **Error Handling**
- [ ] Test network connectivity during voice operations
- [ ] Verify graceful handling of empty transcripts
- [ ] Test edge cases in plan generation

## 📊 **Data Persistence (Mock)**
- [ ] Verify transcript editing persists during session
- [ ] Test plan state maintenance between tabs
- [ ] Check task status persistence

---

## 🎯 **Expected Results Summary**

### **Critical Features That Should Work:**
1. ✅ Login authentication flow
2. ✅ Homepage voice planning showcase
3. ✅ Navigation to voice planning workbench
4. ✅ Recording button with visual feedback
5. ✅ Plan generation with tab switching
6. ✅ Drag-and-drop task editing
7. ✅ Timeline visualization
8. ✅ Quality gates metrics
9. ✅ Intent chips extraction
10. ✅ Mobile responsive design

### **Known Limitations (Demo Mode):**
- Audio recording is simulated (no actual microphone access)
- Plan generation uses mock data based on transcript keywords
- All data is session-based (no actual persistence)
- Metrics are static demo values

---

## 🚨 **If Something Doesn't Work:**

1. **Check Browser Console** for JavaScript errors
2. **Verify Network Tab** for failed API calls
3. **Test Incognito Mode** to rule out extension conflicts
4. **Clear Browser Cache** and reload
5. **Check Responsive Design** at different viewport sizes

## 📝 **Feedback Collection:**
- Note any visual inconsistencies
- Record performance issues
- Document usability problems
- Suggest improvements for the voice workflow

---

**Run through this checklist systematically and report any issues found!**
