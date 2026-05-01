# Space School - Architecture & Design Documentation

**Author**: Omar Mohamed Farouk  
**Program**: International Baccalaureate (IB)  
**Date**: April 30, 2026

---

## 1. Overview

**Space School** is a modern, responsive web application built with Vanilla JavaScript, HTML5, and CSS3. It provides an educational platform focused on inspiring and educating users about space exploration and astronomy.

### Key Technologies
- **Frontend**: Vanilla JS (ES6 modules), HTML5, CSS3
- **Authentication**: Firebase Web SDK v12.12.1 (Google OAuth, Email/Password, Passwordless)
- **PWA**: Service Worker for offline support and installability
- **Responsive Design**: Mobile-first approach (320px - 4K)
- **Architecture Pattern**: Modular UI system with configurable components

---

## 2. Project Structure

```
d:\Schol\summautive\
├── index.html              # Main HTML scaffold with PWA manifest link
├── style.css               # Responsive CSS system with CSS variables
├── auth.js                 # Firebase authentication module (exports)
├── main.js                 # Event handlers and auth state management
├── ui.js                   # Configurable UI system (topbar, popover, routing)
├── service-worker.js       # PWA service worker for offline support
├── manifest.json           # PWA manifest (installability metadata)
├── [other HTML pages]      # Games, FAQ, Solar System, etc.
└── ARCHITECTURE.md         # This file
```

---

## 3. Module Descriptions

### 3.1 `auth.js` - Authentication Module

**Purpose**: Encapsulates Firebase authentication logic with error handling.

**Key Exports**:
- `signInWithGoogle()` — OAuth popup flow
- `signInWithEmail(email, password)` — Email/password authentication
- `createUserWithEmail(email, password)` — Account registration
- `signOutUser()` — Sign-out handler
- `sendPasswordlessSignInLink(email)` — Email link passwordless auth
- `handleEmailLinkSignIn()` — Complete email link sign-in
- `auth` — Firebase auth instance (singleton)

**Error Handling**: All functions use try/catch blocks and throw user-friendly error messages.

**Security Notes**:
- Firebase API keys are currently in-source (development only)
- **TODO**: Migrate to environment variables for production:
  ```
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  ```

---

### 3.2 `main.js` - Event Coordination Module

**Purpose**: Binds DOM events to auth functions and manages auth state display.

**Responsibilities**:
1. Wire form submit handlers to auth functions
2. Listen to Firebase auth state changes
3. Update UI (topbar avatar, sign-out button visibility)
4. Display user email and sign-in status
5. Handle email link sign-in on page load

**Key Event Listeners**:
- Google Sign-In button
- Email/Password form
- Create Account form
- Passwordless form
- Sign-Out button

**Auth State Updates**:
- Displays `user.email` when signed in
- Shows user's `photoURL` as a small avatar circle
- Updates visibility of sign-out button

---

### 3.3 `ui.js` - Configurable UI System

**Purpose**: Provides a pluggable UI injection system with a public API for runtime control.

**Architecture**:
- **`defaultConfig`**: Customizable configuration object (nav links, auth sections)
- **Rendering**: `renderTopbar()` builds and injects HTML into the DOM
- **State Management**: CSS classes and ARIA attributes for accessibility
- **Event Binding**: Delegates to reusable handler functions
- **Public API**: `window.UI` exposes functions for programmatic control

**Key Functions**:

| Function | Purpose |
|----------|---------|
| `openAuthPopover()` | Show auth popover with positioning |
| `closeAuthPopover()` | Hide popover and cleanup listeners |
| `toggleAuthPopover()` | Toggle open/closed state |
| `expandSection(id)` | Open accordion section by ID |
| `collapseSection(id)` | Close accordion section by ID |
| `registerRoute(path, handler)` | Map routes to handler functions |
| `navigateTo(path)` | Navigate and execute route handler |
| `updateHeaderHeight()` | Update CSS variable with actual header height |

**Customization Example**:
```javascript
// Modify defaultConfig before initialization
defaultConfig.navLinks.push({
  label: 'Blog',
  href: 'blog.html'
});
// Re-initialize
window.UI = window.UI || initUI();
```

---

### 3.4 `style.css` - Responsive Design System

**Purpose**: Provides a cohesive, scalable design system with mobile-first CSS.

**CSS Variables** (customizable):
```css
--header-height: 72px       /* Set by JavaScript */
--bg: #071026              /* Background color */
--accent: #6dd3ff          /* Primary accent */
--accent-2: #8be38b        /* Secondary accent */
--gap: 18px                /* Spacing unit */
--radius: 12px             /* Border radius */
--max-width: 1200px        /* Container max width */
--fluid-base: clamp(...)   /* Responsive base font */
--h1-size: clamp(...)      /* Responsive heading */
```

**Responsive Breakpoints**:
- **Mobile** (320px-399px): Extra small phones
- **Mobile** (400px-699px): Standard mobile
- **Tablet** (700px-899px): Small tablets
- **Desktop** (900px-1919px): Laptops and desktops
- **TV/Large** (1920px+): Large screens

**Key Styles**:
- Fixed header with backdrop blur
- Animated auth popover (transforms, transitions)
- Accordion with `max-height` animations
- Mobile overlay navigation
- Accessibility focus states

---

### 3.5 `service-worker.js` - PWA Offline Support

**Purpose**: Enables Progressive Web App features (offline, installable, app-like).

**Caching Strategy**:
- **Install**: Cache static assets (HTML, CSS, JS)
- **Fetch - Network-first** (API calls): Try network, fallback to cache
- **Fetch - Cache-first** (static assets): Use cache, fetch as fallback

**Key Capabilities**:
- Offline availability of cached pages
- Background sync ready (future enhancement)
- Update detection and notification
- Clean old cache versions on activation

---

## 4. Data Flow Diagram

```
User Interaction
    ↓
[Event Handler in main.js]
    ↓
[Firebase Auth Function in auth.js]
    ↓
[Firebase Backend]
    ↓
[onAuthStateChanged callback]
    ↓
[Update DOM (main.js)]
    ↓
[Render Avatar & Status]
```

---

## 5. Authentication Flows

### 5.1 Google OAuth Flow
```
User clicks "Sign in with Google"
    ↓
signInWithGoogle() calls GoogleAuthProvider
    ↓
Popup opens (requires user's Google account)
    ↓
Firebase validates response
    ↓
onAuthStateChanged fires
    ↓
Avatar displayed, status updated
```

### 5.2 Passwordless Email Flow
```
User enters email
    ↓
sendPasswordlessSignInLink(email)
    ↓
Firebase sends email with link
    ↓
User clicks link in email (contains code in URL)
    ↓
handleEmailLinkSignIn() detects link
    ↓
User completes sign-in
    ↓
Auth state updates
```

---

## 6. Accessibility Features

### ARIA Attributes
- `aria-haspopup="true"` — Popover button
- `aria-expanded="true/false"` — Open/closed state
- `aria-hidden="true/false"` — Visibility state
- `aria-label` — Descriptive labels for buttons
- `role="region"` — Accordion body regions

### Keyboard Navigation
- Tab/Shift+Tab to move focus
- Enter/Space to activate buttons
- Escape to close popover
- Links keyboard accessible

### Focus Visible
- All interactive elements have focus-visible styles
- High contrast indicators

---

## 7. Error Handling & Logging

**Logging Convention**:
```javascript
console.error('[Module] Description:', error);
```

**Try/Catch Pattern**:
- All async functions wrapped in try/catch
- User-friendly error messages in alerts
- Detailed logs for debugging

**Error Recovery**:
- Network failures gracefully fall back to cache
- Missing elements don't crash app
- Invalid routes redirect to home

---

## 8. Security Considerations

### Current State
- Firebase API key is visible in source (development only)
- Email link stored in localStorage for verification

### Recommendations for Production
1. **Externalize Firebase Config**:
   ```env
   VITE_FIREBASE_API_KEY=<key>
   VITE_FIREBASE_AUTH_DOMAIN=<domain>
   # ... other keys
   ```

2. **Implement Content Security Policy (CSP)**:
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self' https://www.gstatic.com/firebasejs/">
   ```

3. **Enable HTTPS**: All external requests must use HTTPS

4. **CORS Configuration**: Only allow expected origins

---

## 9. Performance Optimizations

### Current
- CSS variables for efficient style updates
- Event delegation to reduce listener count
- Service worker caches static assets
- Minimal DOM manipulation (one render on init)

### Future Enhancements
- Code splitting and lazy loading
- Image optimization and WebP support
- Minification and tree-shaking
- HTTP/2 server push for critical assets

---

## 10. Testing Strategy

### Manual Testing Checklist
- [ ] Google sign-in flow works
- [ ] Email/password sign-in works
- [ ] Passwordless email link works
- [ ] Avatar displays for Google users
- [ ] Sign-out clears session
- [ ] Mobile popover doesn't overflow
- [ ] Keyboard navigation works
- [ ] Offline cache serves assets
- [ ] All routes navigate correctly

### Unit Test Ideas (Future)
```javascript
// auth.js tests
test('signInWithGoogle rejects on popup block')
test('signInWithEmail handles invalid credentials')

// ui.js tests
test('expandSection updates maxHeight')
test('navigateTo executes registered handler')
test('positionAuthPopover avoids viewport overflow')
```

---

## 11. Deployment Instructions

### Prerequisites
- Firebase project with authentication enabled
- Hosting platform (Netlify, Vercel, or GitHub Pages)
- Git repository

### Steps
1. **Set environment variables** (in your hosting platform):
   ```
   VITE_FIREBASE_API_KEY = ...
   VITE_FIREBASE_AUTH_DOMAIN = ...
   ```

2. **Update Firebase domain allowlist** in Firebase Console:
   - Add your production domain
   - Add localhost:8000 for local development

3. **Deploy**:
   ```bash
   git push origin main
   # Your hosting platform auto-deploys
   ```

4. **Verify**:
   - Visit `https://yourdomain.com`
   - Test auth flows
   - Check Service Worker in DevTools

---

## 12. Future Enhancements

- [ ] Two-Factor Authentication (2FA)
- [ ] User profile pages with profile pictures
- [ ] Email verification flow
- [ ] Account recovery / password reset
- [ ] Social sign-in (GitHub, Microsoft)
- [ ] User preferences and dark mode toggle
- [ ] Analytics and crash reporting
- [ ] Automated tests and CI/CD
- [ ] Internationalization (i18n)
- [ ] Push notifications

---

## 13. References & Resources

- [Firebase Web SDK Docs](https://firebase.google.com/docs/web/setup)
- [MDN Service Worker Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Variables Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

---

## 14. Conclusion

Space School demonstrates a modern, production-ready approach to building responsive web applications with progressive enhancement. The modular architecture, comprehensive error handling, and accessibility-first design make it a solid foundation for further development and scale.

**Built with**: Vanilla JavaScript, HTML5, CSS3, Firebase  
**Status**: Production-ready (with recommended security updates)  
**Last Updated**: April 30, 2026
