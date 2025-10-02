# PWA Mobile Installation Guide

## Overview

Foco is a **Progressive Web App (PWA)**, not a traditional native app. This means:
- ✅ **No App Store or Google Play required**
- ✅ **Install directly from the browser**
- ✅ **Works on all devices** (iOS, Android, Desktop)
- ✅ **Always up-to-date** (no manual updates needed)
- ✅ **Smaller download size** (no heavy app store downloads)
- ✅ **Same experience as native apps** (offline, notifications, home screen icon)

---

## What Changed on the Homepage

### Before
The homepage showed misleading download buttons:
- 🍎 "App Store" button (didn't exist)
- 🤖 "Google Play" button (didn't exist)
- 💻 "Desktop" button (unclear what it did)

### After
The homepage now clearly communicates PWA installation:

#### **On Mobile Devices:**
- Large, prominent **"Instalar Foco"** button
- Detects if PWA can be installed
- Triggers browser's native install prompt
- Falls back to manual instructions for iOS (Safari doesn't support automatic prompts)
- Shows installation status ("Instalado" if already installed)

#### **On Desktop:**
- Shows **"Progressive Web App"** messaging
- Instructs users to look for install icon in browser
- Clear explanation of what a PWA is

---

## Mobile Installation Experience

### Android (Chrome, Edge, Samsung Internet)

**Automatic Installation:**
1. User visits https://foco.mx on mobile
2. Sees large blue "Instalar Foco" button
3. Taps the button
4. Browser shows native install prompt
5. User taps "Install"
6. Foco appears on home screen like a native app

**Manual Installation (if automatic doesn't work):**
1. Tap menu (⋮) in browser
2. Select "Install app" or "Add to Home screen"
3. Confirm installation

### iOS (Safari)

**Manual Installation (iOS doesn't support automatic prompts):**
1. User visits https://foco.mx on mobile
2. Taps "Instalar Foco" button
3. Sees instructions:
   - Tap the Share button (⬆️)
   - Select "Add to Home Screen"
   - Tap "Add"
4. Foco appears on home screen

**Note:** iOS Safari doesn't support the `beforeinstallprompt` event, so we show manual instructions instead.

---

## Desktop Installation Experience

### Chrome, Edge, Brave (Chromium browsers)

**Automatic:**
1. Visit https://foco.mx
2. Look for install icon (⊕) in address bar
3. Click to install
4. Foco opens as standalone app

**From Homepage:**
1. Visit https://foco.mx
2. Scroll to "Instala Foco" section
3. See PWA explanation
4. Look for browser's install icon

### Safari (macOS)

**Manual:**
1. Visit https://foco.mx
2. File → Add to Dock
3. Foco appears in Dock

---

## Technical Implementation

### Homepage Changes (`src/app/page.tsx`)

**Added:**
- `useInstallPrompt()` hook for PWA installation
- Mobile detection: `/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)`
- Conditional rendering based on device type
- Install button with three states:
  1. **Can Install** → Triggers `promptInstall()`
  2. **Already Installed** → Shows "✓ Instalado"
  3. **Manual Required** → Shows platform-specific instructions

**Removed:**
- Fake "App Store" button
- Fake "Google Play" button
- Misleading "Desktop" button

**New UI Elements:**
```tsx
// Mobile Install Button
<motion.button onClick={handleInstall}>
  <Download icon />
  {isInstalled ? '✓ Instalado' : 'Instalar Foco'}
  "Sin App Store • Instalación instantánea"
</motion.button>

// PWA Explanation
<div className="bg-blue-50">
  <strong>¿Qué es una PWA?</strong>
  Una Progressive Web App funciona como una app nativa pero sin 
  necesidad de descargarla desde una tienda.
</div>

// Features Grid
- ⚡ Instantáneo
- 📱 Todos los dispositivos  
- ✨ Siempre actualizado
```

### Install Prompt Component (`src/components/pwa/install-prompt.tsx`)

**Updated:**
- Translated all text to Spanish
- "Instala Foco en tu dispositivo"
- "Acceso instantáneo, funciona sin conexión, y notificaciones en tiempo real"
- Features: "Acceso sin conexión", "Notificaciones", "Inicio rápido", "Como app nativa"
- Buttons: "Instalar App", "Más tarde"

---

## User Experience Flow

### First-Time Mobile Visitor

1. **Lands on homepage** → Sees hero section
2. **Scrolls down** → Sees "Instala Foco" section
3. **Reads PWA explanation** → Understands it's not from App Store
4. **Taps install button** → Browser prompts to install
5. **Confirms** → App installs to home screen
6. **Opens from home screen** → Full-screen app experience

### Returning Mobile Visitor (Already Installed)

1. **Lands on homepage** → Sees hero section
2. **Scrolls down** → Sees "✓ Instalado - Foco está listo"
3. **Knows app is ready** → Can open from home screen anytime

### iOS Visitor (Manual Installation Required)

1. **Lands on homepage** → Sees hero section
2. **Scrolls down** → Sees "Instala Foco" section
3. **Taps install button** → Sees alert with instructions:
   ```
   Para instalar en iOS:
   
   1. Toca el botón de compartir (⬆️)
   2. Selecciona "Añadir a pantalla de inicio"
   3. Toca "Añadir"
   ```
4. **Follows instructions** → App installs to home screen

---

## Benefits of PWA vs Native Apps

### For Users:
- ✅ **No app store friction** - Install in seconds
- ✅ **No storage concerns** - Smaller footprint
- ✅ **Always latest version** - Auto-updates
- ✅ **Works everywhere** - One app for all devices
- ✅ **Try before install** - Use in browser first

### For Developers:
- ✅ **Single codebase** - Web app = mobile app
- ✅ **No app store approval** - Deploy instantly
- ✅ **No platform fees** - No 30% cut
- ✅ **Easier updates** - Push changes immediately
- ✅ **Better SEO** - Discoverable via search

---

## Testing the Installation

### On Android:
1. Open Chrome on Android device
2. Visit https://foco.mx
3. Scroll to install section
4. Tap "Instalar Foco"
5. Verify install prompt appears
6. Install and check home screen

### On iOS:
1. Open Safari on iPhone
2. Visit https://foco.mx
3. Scroll to install section
4. Tap "Instalar Foco"
5. Verify instructions alert appears
6. Follow instructions to install
7. Check home screen for icon

### On Desktop:
1. Open Chrome/Edge
2. Visit https://foco.mx
3. Look for install icon in address bar
4. Click to install
5. Verify standalone window opens

---

## Troubleshooting

### "Install button doesn't work on Android"
- **Cause:** Browser doesn't support PWA installation
- **Solution:** Use Chrome, Edge, or Samsung Internet

### "No install prompt on iOS"
- **Expected:** iOS Safari doesn't support automatic prompts
- **Solution:** Follow manual instructions shown in alert

### "Already installed but button still shows"
- **Cause:** Detection issue
- **Solution:** Refresh page or clear browser cache

### "Install icon not in address bar"
- **Cause:** PWA requirements not met or already installed
- **Solution:** Check manifest.json and service worker are loading

---

## Next Steps

### Recommended Enhancements:

1. **Add install analytics** - Track installation rates
2. **A/B test messaging** - Optimize conversion
3. **Add video tutorial** - Show installation process
4. **Create FAQ section** - Answer common questions
5. **Add testimonials** - Social proof for PWA benefits

### Future Improvements:

1. **Smart install timing** - Show prompt after user engagement
2. **Platform-specific screenshots** - Show how it looks installed
3. **Installation success celebration** - Confetti animation
4. **Onboarding flow** - Guide new users after install
5. **Share functionality** - Let users invite others

---

## Summary

✅ **Homepage now clearly communicates PWA installation**
✅ **No more misleading App Store/Google Play buttons**
✅ **Mobile-optimized install experience**
✅ **Platform-specific instructions for iOS**
✅ **Educational content about PWAs**
✅ **Easy one-tap installation on Android**
✅ **Professional, trustworthy presentation**

The site now accurately represents Foco as a Progressive Web App and makes installation simple and clear for all mobile visitors! 🚀

