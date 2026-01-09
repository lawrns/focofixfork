# Accessibility Quick Reference Guide

**Foco Project - WCAG 2.1 Level AA Compliant**

## Keyboard Shortcuts

### Navigation
| Action | Shortcut |
|--------|----------|
| Move focus to next element | `Tab` |
| Move focus to previous element | `Shift + Tab` |
| Activate button/link | `Enter` or `Space` |
| Close modal/dialog | `Escape` |

### Kanban Board
| Action | Shortcut |
|--------|----------|
| Move task right (next status) | `Right Arrow` |
| Move task left (previous status) | `Left Arrow` |
| Select task | `Space` |
| Confirm move | `Enter` |
| Cancel | `Escape` |

### Forms
| Action | Shortcut |
|--------|----------|
| Submit form | `Enter` (when in input field) |
| Move to next field | `Tab` |
| Move to previous field | `Shift + Tab` |
| Show error/hint | `Alt + H` |

### Global
| Action | Shortcut |
|--------|----------|
| Open accessibility menu | `Alt + A` |
| Open keyboard help | `Alt + K` |
| Toggle high contrast | `Alt + C` |
| Increase font size | `Alt + +` |
| Decrease font size | `Alt + -` |

---

## Screen Reader Support

### Getting Started
**macOS:**
- Enable: System Preferences → Accessibility → VoiceOver
- Shortcut: `Cmd + F5`

**Windows (NVDA):**
- Download from [nvaccess.org](https://www.nvaccess.org/)
- Shortcut: `Ctrl + Alt + N`

**Windows (JAWS):**
- Available from [freedomscientific.com](https://www.freedomscientific.com/)

### What's Announced
- ✅ Page title and purpose
- ✅ All headings and structure
- ✅ Button labels and descriptions
- ✅ Form field labels and required status
- ✅ Error messages and validation feedback
- ✅ Dynamic content updates (live regions)
- ✅ Image descriptions (alt text)

---

## Visual Accessibility Features

### High Contrast Mode
- **Activation:** Settings → Accessibility → High Contrast
- **Effect:** Increased color contrast, bold text
- **Benefit:** Better visibility for low vision users

### Reduced Motion
- **Activation:** System → Accessibility → Display → Reduce motion
- **Effect:** Animations disabled, transitions instant
- **Benefit:** Prevents motion sickness/dizziness

### Large Text
- **Activation:** Settings → Accessibility → Font Size
- **Options:** Small, Medium (default), Large, Extra-Large
- **Effect:** Proportionally increases all text sizes

### Color Blind Support
- **Activation:** Settings → Accessibility → Color Blind Support
- **Effect:** Patterns in addition to colors for status indicators
- **Types Supported:** Deuteranopia, Protanopia, Tritanopia

### Dyslexia-Friendly Font
- **Activation:** Settings → Accessibility → Dyslexia Support
- **Font:** OpenDyslexic
- **Effect:** Letter spacing, weighted baseline, reduced ambiguity

---

## Component Accessibility Patterns

### Buttons
```
✓ Always have text label or aria-label
✓ Visible focus indicator when tabbed
✓ Activated by Enter or Space
✓ Clear visual state (normal, hover, pressed, disabled)
```

### Links
```
✓ Underlined or clearly differentiated
✓ Descriptive link text (not "click here")
✓ Focus indicator
✓ Context provided in aria-label if needed
```

### Form Fields
```
✓ Associated label or aria-label
✓ Visible focus indicator
✓ Required status indicated
✓ Error messages linked with aria-describedby
✓ Validation feedback announced
```

### Modals/Dialogs
```
✓ Title with id, referenced by aria-labelledby
✓ Focus trapped within modal
✓ Escape key closes dialog
✓ Focus returns to trigger on close
```

### Menus/Dropdowns
```
✓ Arrow keys navigate options
✓ Enter/Space selects option
✓ Escape closes menu
✓ All options keyboard accessible
```

### Tables
```
✓ Proper <thead> and <tbody>
✓ <th> elements with scope attribute
✓ Table caption or aria-label
✓ Row and column headers identified
```

### Lists
```
✓ Semantic <ul>, <ol>, <li> elements
✓ Proper nesting
✓ Screen readers announce list structure
```

---

## Testing Your Accessibility

### Run Built-in Accessibility Test
1. Go to Settings
2. Click "Run Accessibility Test"
3. Review results in notification

### Using Browser DevTools

**Chrome/Edge:**
1. Press `F12` to open DevTools
2. Go to Lighthouse tab
3. Select "Accessibility" option
4. Click "Analyze page load"

**Firefox:**
1. Press `F12` to open DevTools
2. Go to Accessibility Inspector
3. Review issues and tree structure

### Using Axe DevTools
1. Install Axe DevTools extension
2. Click extension icon
3. Click "Scan ALL of my page"
4. Review violations and best practices

---

## Common Accessibility Issues & Fixes

### Missing Alt Text
**Issue:** Images without descriptions
**Fix:** Add alt attribute with descriptive text
```tsx
<img src="chart.png" alt="Monthly revenue trend showing 15% growth" />
```

### Low Color Contrast
**Issue:** Text hard to read
**Fix:** Ensure 4.5:1 contrast ratio for normal text
**Tool:** Use contrast checker in accessibility settings

### No Focus Indicator
**Issue:** Can't see which button/link has focus
**Fix:** Add focus styles
```tsx
<button className="focus:ring-2 focus:ring-blue-500 focus:outline-none">
  Action
</button>
```

### Keyboard Trap
**Issue:** Can't tab away from element
**Fix:** Ensure focus can move using Tab/Shift+Tab

### Missing Form Labels
**Issue:** Screen readers can't identify form fields
**Fix:** Use associated labels or aria-label
```tsx
<label htmlFor="name">Full Name</label>
<input id="name" type="text" />
```

### Unlabeled Buttons
**Issue:** Icon-only buttons confusing to screen readers
**Fix:** Add aria-label or visible text
```tsx
<button aria-label="Close notification">×</button>
```

---

## Browser Extensions for Testing

### Recommended Tools
1. **Axe DevTools** - Automated accessibility testing
2. **WAVE** - Visual feedback on accessibility issues
3. **Lighthouse** - Built into Chrome DevTools
4. **Color Contrast Analyzer** - Check contrast ratios
5. **Screen Reader** - NVDA (free) or JAWS (paid)

---

## WCAG 2.1 Standards Summary

### Level A (Basic)
- Keyboard accessible
- Alt text for images
- Proper structure
- No auto-playing audio
- Color not sole identifier

### Level AA (Enhanced) ← **Foco Complies**
- Color contrast 4.5:1
- Visible focus indicators
- Consistent navigation
- Form validation feedback
- Captions for audio

### Level AAA (Advanced)
- Higher contrast (7:1)
- Sign language interpretation
- Extended descriptions
- Plain language

---

## Additional Resources

### Official Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Best Practices](https://www.w3.org/TR/wai-aria-practices-1.1/)
- [WebAIM Articles](https://webaim.org/articles/)

### Learning Resources
- [A11y Project](https://www.a11yproject.com/)
- [Accessibility Basics](https://www.a11yproject.com/beginner/)
- [Inclusive Components](https://inclusive-components.design/)

### Testing Tools
- [WAVE](https://wave.webaim.org/)
- [Axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Pa11y](https://pa11y.org/)

### Community
- [W3C WAI Community](https://www.w3.org/WAI/)
- [A11y Twitter](https://twitter.com/a11y)
- [Accessibility Slack Community](https://a11y.slack.com/)

---

## Contact & Support

### Report Accessibility Issues
1. Use built-in accessibility test in Settings
2. Or contact: accessibility@foco.mx

### Provide Feedback
- Share your experience
- Suggest improvements
- Report bugs
- Request features

---

## Quick Facts

- **Standard Compliant:** WCAG 2.1 Level AA ✅
- **Keyboard Support:** 100% of features
- **Screen Reader Ready:** Yes ✅
- **Color Contrast:** 4.5:1+ ✅
- **Focus Visible:** All interactive elements ✅
- **Responsive:** Mobile, tablet, desktop ✅
- **Form Labels:** All present ✅
- **Error Handling:** User-friendly messages ✅

---

**Updated:** January 9, 2026
**Status:** Production Ready
**Next Update:** As features are added
