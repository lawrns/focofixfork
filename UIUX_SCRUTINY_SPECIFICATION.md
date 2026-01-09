# Foco UI/UX Scrutiny Specification - Basecamp Level Quality

**Objective:** Comprehensive analysis of all UI/UX elements to ensure Basecamp-level excellence (clean, intuitive, beautiful, professional)

**Deployment:** https://foco.mx (Production)
**Environment:** Demo mode enabled with full access
**Test Duration:** Parallel analysis across 10 specialized agents
**Standard:** Basecamp design principles (simplicity, elegance, functionality)

---

## Scrutiny Dimensions

### 1. **Visual Design & Aesthetics (Agent 1)**

#### Typography
- [ ] Font hierarchy is clear and consistent (heading sizes, weights, line-heights)
- [ ] Font families are professional and readable (Inter, system fonts)
- [ ] Font sizes scale appropriately across breakpoints
- [ ] Line length is optimal for readability (50-75 characters per line)
- [ ] Letter spacing and line height create breathing room
- [ ] No orphaned text or awkward line breaks
- [ ] Font weights used consistently (regular 400, medium 500, bold 700)

#### Color Palette
- [ ] Color palette is cohesive and professional
- [ ] Primary blue (#0052CC) feels premium and trustworthy
- [ ] Secondary colors (success, warning, danger) are distinct and accessible
- [ ] Neutral grays have proper contrast and don't feel washed out
- [ ] Background colors support content hierarchy
- [ ] Color usage is intentional (not random)
- [ ] Dark mode colors are equally polished
- [ ] Color transitions/gradients are smooth and tasteful

#### Spacing & Layout
- [ ] Consistent spacing system (8px grid or similar)
- [ ] Margins and padding feel balanced, not cramped
- [ ] White space enhances readability and focus
- [ ] Container widths are optimal (not too wide, not too narrow)
- [ ] Gutters between columns are proportional
- [ ] Elements don't feel "floating" or disconnected
- [ ] Density is appropriate (not cluttered, not sparse)
- [ ] Alignment is pixel-perfect (no visual misalignment)

#### Visual Hierarchy
- [ ] Most important elements are visually prominent
- [ ] Section titles command attention appropriately
- [ ] Button hierarchy is clear (primary, secondary, tertiary)
- [ ] Cards and containers have visual weight
- [ ] Emphasis is used sparingly for effect
- [ ] No visual noise or distractions

---

### 2. **Components & Patterns (Agent 2)**

#### Button Design
- [ ] Primary buttons stand out (solid, filled)
- [ ] Secondary buttons are subtle but clear (outlined)
- [ ] Tertiary buttons are minimal (text/ghost)
- [ ] Button states are obvious (hover, active, disabled)
- [ ] Button text is action-oriented and clear
- [ ] Icon spacing within buttons is consistent
- [ ] Button sizes are appropriate (44px minimum for touch)
- [ ] Hover states are smooth and satisfying (not jarring)

#### Input Fields
- [ ] Text inputs have clear focus states (border, shadow, color change)
- [ ] Labels are properly positioned and visible
- [ ] Placeholders are helpful but don't replace labels
- [ ] Validation states are clear (error, success, warning)
- [ ] Error messages are helpful and specific
- [ ] Input heights are consistent (44px+ for mobile)
- [ ] Keyboard focus is visible and navigable

#### Cards
- [ ] Card shadows are subtle (not harsh)
- [ ] Card borders (if used) are thin and refined
- [ ] Hover states are subtle and inviting
- [ ] Internal spacing is consistent
- [ ] Card transitions are smooth (not jarring)
- [ ] Cards don't feel isolated or disconnected

#### Navigation
- [ ] Navigation is intuitive and discoverable
- [ ] Active state is visually distinct
- [ ] Hover states are appropriate
- [ ] Mobile navigation is accessible (hamburger, drawer)
- [ ] Breadcrumbs are clear and hierarchical
- [ ] Skip links are available (accessibility)
- [ ] Navigation doesn't interfere with content

#### Modals & Dialogs
- [ ] Modal backdrop is appropriately dark/transparent
- [ ] Modal dialog is centered and sized appropriately
- [ ] Title is clear and descriptive
- [ ] Close button (X) is obvious and accessible
- [ ] Focus trap is working (testing keyboard navigation)
- [ ] Escape key closes modal (standard behavior)
- [ ] Actions (Save/Cancel) are clearly labeled

#### Forms
- [ ] Form layout is logical and scannable
- [ ] Related fields are grouped visually
- [ ] Required indicators are clear (asterisk, "required")
- [ ] Form validation is helpful (real-time or on blur)
- [ ] Error messages are specific and actionable
- [ ] Success messages appear after submission
- [ ] Multi-step forms show progress clearly
- [ ] Form submit button is prominent and final step

#### Lists & Tables
- [ ] List items have proper spacing
- [ ] Table headers are distinguished
- [ ] Striping (if used) aids readability
- [ ] Sorting indicators are clear
- [ ] Empty states show helpful messages
- [ ] Loading states are animated and clear
- [ ] Pagination is obvious and navigable

---

### 3. **Interaction & Motion (Agent 3)**

#### Animations
- [ ] Animations serve a purpose (not decorative)
- [ ] Animations are smooth and 60 FPS
- [ ] Motion duration is appropriate (100-300ms typically)
- [ ] Easing curves feel natural (not linear)
- [ ] No janky or stuttering animations
- [ ] Animations respect `prefers-reduced-motion` setting
- [ ] Loading states have appropriate animations
- [ ] Transitions between pages feel cohesive

#### Hover States
- [ ] Buttons change on hover (color, shadow, scale)
- [ ] Links have underline or color change on hover
- [ ] Cards have subtle shadow increase or lift
- [ ] Hover states are obvious but not jarring
- [ ] Hover states are consistent across components
- [ ] Touch devices don't show hover states awkwardly
- [ ] Cursor changes appropriately (pointer for interactive)

#### Click/Tap Feedback
- [ ] Buttons show active/pressed state while clicking
- [ ] Feedback is immediate (no lag)
- [ ] Feedback is obvious but not overwhelming
- [ ] Touch targets are at least 44x44px
- [ ] Tap feedback works on all devices
- [ ] No "dead zone" around interactive elements

#### Transitions
- [ ] Page transitions are smooth (not jarring)
- [ ] Loading states don't feel stuck
- [ ] Modals appear smoothly (scale, fade)
- [ ] List additions/removals are animated
- [ ] Expandable sections animate smoothly
- [ ] Color changes fade (not instant)

---

### 4. **Responsive Design (Agent 4)**

#### Mobile (320px - 767px)
- [ ] Layout stacks vertically appropriately
- [ ] Text is readable without pinch-zooming
- [ ] Touch targets are 44px minimum
- [ ] Navigation is accessible (hamburger menu, drawer)
- [ ] Forms are easy to fill on mobile
- [ ] Images scale appropriately
- [ ] No horizontal scrolling
- [ ] Bottom navigation or sticky footer if needed
- [ ] Safe areas respected for notched devices

#### Tablet (768px - 1024px)
- [ ] Layout uses available width efficiently
- [ ] Two-column layouts work well
- [ ] Navigation can be horizontal or vertical
- [ ] Touch-friendly spacing maintained
- [ ] Content is not stretched awkwardly

#### Desktop (1025px+)
- [ ] Content doesn't stretch too wide
- [ ] Two-column layouts are balanced
- [ ] Multi-column layouts are clean
- [ ] Whitespace is generous
- [ ] Mouse interactions are refined (hover states)

#### Orientation Changes
- [ ] Portrait to landscape works smoothly
- [ ] Landscape to portrait works smoothly
- [ ] Layout adapts intelligently (not just shrunk)
- [ ] Content remains readable in both orientations

---

### 5. **Imagery & Icons (Agent 5)**

#### Icons
- [ ] Icons are consistent in style and weight
- [ ] Icon sizes are appropriate and scalable
- [ ] Icons are meaningful and recognizable
- [ ] Icon colors match text color (for consistency)
- [ ] Decorative icons have aria-hidden="true"
- [ ] Icons have accessible labels when needed
- [ ] Icon alignment is clean (vertically centered)

#### Images
- [ ] Images load smoothly (no jumping layout)
- [ ] Images are optimized (not huge file sizes)
- [ ] Images are responsive (proper srcset)
- [ ] Alt text is present and descriptive
- [ ] Image aspect ratios are consistent
- [ ] Images don't stretch or distort
- [ ] Loading states for images are clear

#### Empty States
- [ ] Empty state messages are helpful
- [ ] Icons/illustrations are used appropriately
- [ ] Call-to-action is clear
- [ ] Empty state is visually pleasing (not sad)
- [ ] Shows path to populate content

#### Status Indicators
- [ ] Status colors are consistent (success green, error red)
- [ ] Status is conveyed by more than color alone
- [ ] Badges are clear and appropriately sized
- [ ] Progress indicators are obvious
- [ ] Checkmarks/X marks are clear

---

### 6. **Content & Copy (Agent 6)**

#### Microcopy
- [ ] Button text is action-oriented ("Save", "Delete", "Create")
- [ ] Error messages are specific and helpful
- [ ] Placeholder text is actually helpful
- [ ] Tooltips are concise (not essays)
- [ ] Help text is clear and not condescending
- [ ] No jargon or technical terms for general users
- [ ] Tone is consistent (professional but friendly)

#### Readability
- [ ] Text is left-aligned (English)
- [ ] Line length is appropriate (50-75 chars)
- [ ] Line height provides breathing room
- [ ] Color contrast is sufficient (WCAG AA)
- [ ] No all-caps for extended text
- [ ] Bold used sparingly for emphasis
- [ ] Lists use proper bullet points
- [ ] Numbered lists for sequences

#### Labels & Descriptions
- [ ] Form labels are clear and specific
- [ ] Field requirements are obvious
- [ ] Helper text explains field purpose
- [ ] Placeholder text doesn't replace labels
- [ ] Section headings are descriptive
- [ ] Links are descriptive (not "click here")

---

### 7. **Navigation & Information Architecture (Agent 7)**

#### Primary Navigation
- [ ] Main navigation is obvious
- [ ] Navigation items are clearly labeled
- [ ] Active page is visually distinct
- [ ] Navigation is consistent across pages
- [ ] Mobile navigation is accessible
- [ ] Navigation doesn't interfere with content

#### Secondary Navigation
- [ ] Breadcrumbs show location in hierarchy
- [ ] Tabs clearly show current section
- [ ] Sidebar (if used) is well-organized
- [ ] Collapsible sections are intuitive

#### Footer
- [ ] Footer is visually distinct from content
- [ ] Footer links are organized by category
- [ ] Footer doesn't feel cluttered
- [ ] Legal/contact info is present
- [ ] Footer is accessible on mobile

#### Discoverability
- [ ] Important features are findable
- [ ] Hidden menus are discoverable (hamburger icon visible)
- [ ] Search is prominent (if applicable)
- [ ] Help/documentation is accessible
- [ ] Settings are easy to find

---

### 8. **Accessibility & Inclusivity (Agent 8)**

#### Visual Accessibility
- [ ] Color contrast meets WCAG AA (4.5:1 text)
- [ ] Don't rely on color alone to convey info
- [ ] Text is resizable without loss of functionality
- [ ] Focus indicators are visible and clear
- [ ] No flashing content (potential seizures)
- [ ] Animations respect motion sensitivity

#### Keyboard Navigation
- [ ] All features accessible via keyboard
- [ ] Tab order is logical and visible
- [ ] No keyboard traps
- [ ] Escape key closes modals
- [ ] Enter/Space activates buttons
- [ ] Arrow keys work in lists/dropdowns

#### Screen Reader
- [ ] Page structure is semantic
- [ ] Form labels are associated
- [ ] Image alt text is descriptive
- [ ] Buttons have accessible names
- [ ] ARIA attributes used correctly
- [ ] Live regions announce updates
- [ ] Skip links present

#### Inclusive Design
- [ ] Dyslexia-friendly font option available
- [ ] Color blind mode available (patterns + colors)
- [ ] Text alternatives for visual content
- [ ] Captions for audio/video (if applicable)
- [ ] Multiple ways to complete tasks
- [ ] Instructions don't assume ability

---

### 9. **Performance & Technical (Agent 9)**

#### Load Performance
- [ ] Page loads quickly (< 2 seconds)
- [ ] First paint is fast (< 1 second)
- [ ] Time to interactive is reasonable (< 3 seconds)
- [ ] Images load progressively (not all at once)
- [ ] Lazy loading is used for below-fold content
- [ ] No layout shifting on page load

#### Runtime Performance
- [ ] Animations are smooth (60 FPS)
- [ ] No janky scrolling
- [ ] Interactions are responsive (no lag)
- [ ] Forms submit quickly
- [ ] Modals open without delay
- [ ] Lists scroll smoothly (even with many items)

#### Browser Compatibility
- [ ] Works in Chrome, Firefox, Safari, Edge
- [ ] Mobile browsers work smoothly
- [ ] No console errors
- [ ] Graceful degradation for older browsers
- [ ] Dark mode works properly
- [ ] Print styles are appropriate

#### Code Quality (Visual)
- [ ] No visual glitches or artifacts
- [ ] No text cutoff or overflow
- [ ] No weird character encoding issues
- [ ] Fonts load correctly (no FOUT)
- [ ] Images display correctly
- [ ] SVGs render cleanly

---

### 10. **Overall Coherence & Basecamp Comparison (Agent 10)**

#### Design System Consistency
- [ ] Colors are used consistently
- [ ] Spacing is consistent throughout
- [ ] Typography follows rules
- [ ] Button styles are consistent
- [ ] Card designs are consistent
- [ ] Corners have consistent radius
- [ ] Shadows follow same pattern

#### Professional Polish
- [ ] No rough edges or "half-baked" features
- [ ] Transitions feel intentional, not random
- [ ] Details are refined (not overlooked)
- [ ] Attention to micro-interactions (satisfying)
- [ ] Feels like a premium product
- [ ] Competitors feel "behind" in comparison

#### Basecamp Comparison
- [ ] Clean aesthetic like Basecamp (not cluttered)
- [ ] Intuitive navigation like Basecamp (no learning curve)
- [ ] Beautiful typography like Basecamp (refined)
- [ ] Thoughtful spacing like Basecamp (breathing room)
- [ ] Professional color palette like Basecamp
- [ ] Smooth interactions like Basecamp
- [ ] Accessible like Basecamp cares about inclusion

#### Emotional Design
- [ ] Interface feels welcoming and approachable
- [ ] No frustrating error states
- [ ] Success feedback feels rewarding
- [ ] Loading states are reassuring
- [ ] Empty states are friendly (not sad)
- [ ] Overall tone matches brand

---

## Testing Methodology

Each agent should:

1. **Examine the live production site** at https://foco.mx
2. **Use demo credentials:**
   - Owner: owner@demo.foco.local / DemoOwner123!
   - Manager: manager@demo.foco.local / DemoManager123!
   - Member: member@demo.foco.local / DemoMember123!
   - Viewer: viewer@demo.foco.local / DemoViewer123!
3. **Test across different:**
   - Browsers (Chrome, Firefox, Safari)
   - Devices (Mobile, Tablet, Desktop)
   - Screen sizes (375px, 768px, 1920px)
   - Light and dark modes
4. **Document findings with:**
   - Specific location (page URL, component)
   - Screenshot/recording if applicable
   - Severity (Critical, High, Medium, Low)
   - Recommendation for improvement

---

## Expected Findings

### Critical (Must Fix)
- Broken layouts on any viewport
- Inaccessible interactive elements
- Unreadable text (contrast/size)
- Crashes or errors

### High (Should Fix)
- Inconsistent design patterns
- Confusing navigation
- Janky animations
- Poor mobile experience

### Medium (Nice to Fix)
- Minor spacing issues
- Small visual inconsistencies
- Non-critical performance
- Minor UX improvements

### Low (Polish)
- Micro-interactions
- Animation refinements
- Minor copy tweaks
- Detail refinements

---

## Deliverables

Each agent should provide:

1. **Executive Summary** (2-3 sentences)
   - Overall assessment of UI/UX quality
   - Comparison to Basecamp

2. **Findings by Category** (50-100 items total across all agents)
   - Location on site
   - What works well
   - What needs improvement
   - Specific recommendations

3. **Screenshots/Evidence** (5-10 images)
   - Visual proof of findings
   - Before/after where applicable

4. **Priority List**
   - Critical issues first
   - High priority next
   - Medium and low for future

5. **Basecamp Comparison Analysis**
   - Where Foco meets or exceeds Basecamp quality
   - Where Foco could learn from Basecamp
   - Unique strengths of Foco UI/UX

---

## Success Criteria

The UI/UX is production-ready when:

- ✅ All critical issues are resolved
- ✅ No more than 3 high-priority issues remain
- ✅ Design is internally consistent
- ✅ Responsive design works across all viewports
- ✅ Performance is smooth (60 FPS animations, fast loads)
- ✅ Accessibility is complete (WCAG 2.1 AA)
- ✅ Feels like Basecamp or better in overall quality
- ✅ All agents agree it meets "Basecamp level" excellence

---

## Review Process

1. All 10 agents report findings simultaneously
2. Findings are compiled and deduplicated
3. Critical issues are prioritized
4. High-priority issues are batched
5. Fixes are implemented and tested
6. Final verification confirms all issues addressed
7. Production sign-off once complete

---

**Start Date:** January 9, 2026
**Status:** Ready for agent dispatch
**Target:** Basecamp-level UI/UX excellence
**Deployment:** Production (https://foco.mx)
