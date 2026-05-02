/**
 * @fileoverview UI Module - Configurable Topbar & Auth UI Injector
 * Manages responsive navigation, authentication popover, accordion sections, and in-app routing.
 * 
 * CONFIGURATION:
 * Edit `defaultConfig` object to customize:
 * - navLinks: Navigation menu items
 * - authSections: Authentication accordion sections (order, content, visibility)
 * - headerSelector: Header element selector
 * - topbarSelector: Topbar container selector
 * - hideNavBelowWidth: Breakpoint at which nav links hide (responsive)
 * 
 * PUBLIC API:
 * - window.UI.openAuthPopover()
 * - window.UI.closeAuthPopover()
 * - window.UI.toggleAuthPopover()
 * - window.UI.expandSection(id)
 * - window.UI.collapseSection(id)
 * - window.UI.registerRoute(path, handler)
 * - window.UI.navigateTo(path)
 * - window.UI.updateHeaderHeight()
 */

/** @type {Object} Default UI configuration - modify to customize navigation and auth sections */
const defaultConfig = {
  headerSelector: 'header',
  topbarSelector: '#topbar',
  navLinks: [
    { label: 'Home', href: '/index.html' },
    { label: 'Games', href: 'games.html' },
    { label: 'Solar System', href: 'solarsystem.html' },
    { label: 'Lab', href: 'lab.html' },
    { label: 'FAQ', href: 'faq.html' },
    { label: 'Privacy', href: 'privacy.html' }
  ],
  // Auth accordion sections; reorder, remove, or add items here for customization
  actionCards: [
    { id: 'mission', title: 'Start Mission', desc: 'Pilot your rocket through the asteroid belt.', icon: '🚀', link: '/pages/spacemission.html', type: 'game2d' },
    { id: 'solar', title: 'Solar Explorer', desc: 'Interact with high-fidelity 3D planetary models.', icon: '🪐', link: '/pages/solarsystem.html', type: 'viewer3d' },
    { id: 'lab', title: 'Virtual Lab', desc: 'Conduct experiments in zero gravity.', icon: '🧪', link: '/pages/lab.html', type: 'interactive' },
    { id: 'academy', title: 'Space Academy', desc: 'Earn badges by completing courses.', icon: '🎓', link: '/pages/courses.html', type: 'path' }
  ],
  authSections: [
    { id: 'google', title: 'Google sign-in', content: '<div class="acc-content"><button id="googleSignInBtn">Sign in with Google</button></div>' },
    { id: 'email', title: 'Email / Password', content: `<div class="acc-content"><form id="emailSignInForm"><input id="email" type="email" placeholder="Email" required /><input id="password" type="password" placeholder="Password" required /><button type="submit">Sign In</button></form></div>` },
    { id: 'create', title: 'Create account', content: `<div class="acc-content"><form id="createAccountForm"><input id="newEmail" type="email" placeholder="Email" required /><input id="newPassword" type="password" placeholder="Password" required /><button type="submit">Create Account</button></form></div>` },
    { id: 'passwordless', title: 'Passwordless (Email link)', content: `<div class="acc-content"><form id="passwordlessForm"><input id="passwordlessEmail" type="email" placeholder="Email" required /><button type="submit">Send Sign-in Link</button></form></div>` }
  ],
  hideNavBelowWidth: 700 // CSS: hide nav links under this px width (responsive breakpoint)
};

// --- Utility Functions -----
/**
 * Query selector shorthand - returns single element or null
 * @param {string} sel - CSS selector
 * @returns {Element|null}
 */
function qs(sel) { return document.querySelector(sel); }

/**
 * Query selector all shorthand - returns array of elements
 * @param {string} sel - CSS selector
 * @returns {Element[]}
 */
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

/** @type {Function|null} Stores the popover reposition handler for cleanup */
let _ui_popoverReposition = null;

/**
 * Build navigation HTML from config
 * @param {Object} cfg - Configuration object
 * @returns {string} Navigation HTML markup
 * @private
 */
function buildNavHTML(cfg) {
  try {
    return `<nav class="topbar-links">` + cfg.navLinks.map(l => `<a href="${l.href}" class="topbar-link">${l.label}</a>`).join('') + `</nav>`;
  } catch (error) {
    console.error('[UI] Error building nav HTML:', error);
    return '<nav class="topbar-links"></nav>';
  }
}

/**
 * Build authentication popover HTML from config
 * @param {Object} cfg - Configuration object
 * @returns {string} Auth popover HTML markup
 * @private
 */
function buildAuthHTML(cfg) {
  try {
    const header = `
      <div class="auth-popover-header">
        <div id="auth-status">Not signed in</div>
        <button id="signOutBtn" class="ghost" style="display:none">Sign Out</button>
      </div>`;

    const adminSection = `
      <div class="acc-item" data-acc-id="admin">
        <button class="acc-toggle" type="button" tabindex="0" aria-expanded="false">Admin Access</button>
        <div class="acc-body" role="region" aria-labelledby="acc-admin">
          <div class="acc-content">
            <input id="AdminChecker" type="password" placeholder="Enter admin code" style="width:100%; margin-bottom:10px;" />
            <div id="admintools"></div>
          </div>
        </div>
      </div>`;

    const accordion = cfg.authSections.map(sec => {
      return `<div class="acc-item" data-acc-id="${sec.id}">
        <button class="acc-toggle" type="button" tabindex="0" aria-expanded="false">${sec.title}</button>
        <div class="acc-body" role="region" aria-labelledby="acc-${sec.id}">${sec.content}</div>
      </div>`;
    }).join('\n') + adminSection;

    return `<div class="auth-topbar-wrap"><button id="authToggle" class="auth-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">Account ▾</button><div id="authPopover" class="auth-popover" aria-hidden="true">${header}<div class="accordion">${accordion}</div></div></div>`;
  } catch (error) {
    console.error('[UI] Error building auth HTML:', error);
    return '';
  }
}

// --- Routing Support (SPA-style navigation) ---
/** @type {Object} Stores route path -> handler function mappings */
const routeHandlers = Object.create(null);

/**
 * Register a route handler for in-app navigation
 * @param {string} path - Route path (e.g., 'privacy.html')
 * @param {Function} handler - Callback function to execute for this route
 */
function registerRoute(path, handler) {
  try {
    routeHandlers[path] = handler;
  } catch (error) {
    console.error('[UI] Error registering route:', path, error);
  }
}

/**
 * Register default routes (privacy policy, etc.)
 * @private
 */
function registerDefaultRoutes() {
  registerRoute('privacy.html', loadPrivacyPolicy);
  registerRoute('privacypolicy.html', loadPrivacyPolicy);
}

/**
 * Navigate to a route and execute its handler if registered.
 * Falls back to full page navigation if no handler exists.
 * @param {string} path - Route path to navigate to
 * @returns {boolean} True if handler executed, false if full page nav used
 */
function navigateTo(path) {
  try {
    const handler = routeHandlers[path];
    if (handler) { 
      handler(); 
      closeAuthPopover(); 
      return true; 
    }
    window.location.href = path; 
    return false;
  } catch (error) {
    console.error('[UI] Navigation error:', path, error);
    window.location.href = path;
    return false;
  }
}

// --- Header & Popover Position Management ---
/**
 * Update CSS variable with current header height and adjust popover position.
 * Call after DOM changes that might affect header size.
 * @param {string} [headerSel=defaultConfig.headerSelector] - Header element selector
 */
function updateHeaderHeight(headerSel = defaultConfig.headerSelector) {
  try {
    const header = qs(headerSel);
    if (!header) return;
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-height', `${Math.round(h)}px`);
    const pop = qs('.auth-popover');
    if (pop) pop.style.top = `${Math.round(h + 8)}px`;
  } catch (error) {
    console.error('[UI] Error updating header height:', error);
  }
}

/**
 * Position auth popover horizontally and vertically based on viewport and toggle position.
 * Prevents popover from overflowing window edges on small screens.
 * @private
 */
function positionAuthPopover() {
  try {
    const pop = qs('#authPopover'); 
    const toggle = qs('#authToggle'); 
    const header = qs(defaultConfig.headerSelector);
    if (!pop || !toggle) return;
    
    const headerRect = header 
      ? header.getBoundingClientRect() 
      : { bottom: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 72 };
    const toggleRect = toggle.getBoundingClientRect();

    // Temporarily make popover visible for measurement, but hidden from view
    const prevVis = pop.style.visibility;
    pop.style.visibility = 'hidden';
    pop.classList.add('open'); 
    pop.setAttribute('aria-hidden','false'); 
    toggle.setAttribute('aria-expanded','true');
    pop.style.transformOrigin = 'left top';
    pop.style.transform = 'translateY(0) scale(1)';

    const popRect = pop.getBoundingClientRect();
    const margin = 8;
    let left = Math.round(toggleRect.left);
    
    // Adjust left position if popover would overflow right edge
    if (left + popRect.width + margin > window.innerWidth) {
      left = Math.max(margin, Math.round(window.innerWidth - popRect.width - margin));
    }
    
    // Ensure minimum left margin
    if (left < margin) left = margin;
    
    const top = Math.round(headerRect.bottom + 8);

    // Apply calculated positions
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.style.visibility = prevVis || '';
  } catch (error) {
    console.error('[UI] Error positioning auth popover:', error);
  }
}

/**
 * Open and display auth popover with proper positioning.
 * Locks scroll on mobile devices and registers repositioning listeners.
 */
function openAuthPopover() {
  try {
    const pop = qs('#authPopover'); 
    const toggle = qs('#authToggle');
    if (!pop || !toggle) return;
    
    updateHeaderHeight();

    // Close mobile overlay if open
    const mobileOverlay = qs('.mobile-nav-overlay');
    if (mobileOverlay && mobileOverlay.classList.contains('open')) {
      mobileOverlay.classList.remove('open');
      const mobileBtn = qs('#mobileMenuBtn'); 
      if (mobileBtn) mobileBtn.setAttribute('aria-expanded','false');
    }

    // Position and show popover, lock scroll on small screens
    positionAuthPopover();
    if (window.innerWidth <= (defaultConfig.hideNavBelowWidth || 700)) {
      document.body.classList.add('no-scroll');
    }

    // Add reposition listeners while popover is open
    if (!_ui_popoverReposition) {
      _ui_popoverReposition = () => { 
        if (qs('#authPopover')?.classList.contains('open')) {
          positionAuthPopover(); 
        }
      };
      window.addEventListener('resize', _ui_popoverReposition);
      window.addEventListener('scroll', _ui_popoverReposition, true);
    }
  } catch (error) {
    console.error('[UI] Error opening auth popover:', error);
  }
}

/**
 * Close and hide auth popover.
 * Removes repositioning listeners and restores scroll.
 */
function closeAuthPopover() {
  try {
    const pop = qs('#authPopover'); 
    const toggle = qs('#authToggle');
    if (!pop || !toggle) return;
    
    pop.classList.remove('open'); 
    pop.setAttribute('aria-hidden','true'); 
    toggle.setAttribute('aria-expanded','false');
    
    // Clear inline positioning so CSS fallback applies
    pop.style.left = ''; 
    pop.style.top = ''; 
    pop.style.transform = ''; 
    pop.style.transformOrigin = '';
    
    try { 
      document.body.classList.remove('no-scroll'); 
    } catch (e) { 
      // Silent error handling for edge cases
    }
    
    // Remove listeners
    if (_ui_popoverReposition) {
      window.removeEventListener('resize', _ui_popoverReposition);
      window.removeEventListener('scroll', _ui_popoverReposition, true);
      _ui_popoverReposition = null;
    }
  } catch (error) {
    console.error('[UI] Error closing auth popover:', error);
  }
}

/**
 * Toggle auth popover open/closed state
 */
function toggleAuthPopover() { 
  try {
    const pop = qs('#authPopover'); 
    if (!pop) return; 
    pop.classList.contains('open') ? closeAuthPopover() : openAuthPopover(); 
  } catch (error) {
    console.error('[UI] Error toggling auth popover:', error);
  }
}

/**
 * Expand an accordion section by ID
 * @param {string} id - Section ID (from authSections config)
 */
function expandSection(id) {
  try {
    const item = qs(`.acc-item[data-acc-id="${id}"]`); 
    if (!item) return;
    const btn = item.querySelector('.acc-toggle'); 
    const body = item.querySelector('.acc-body'); 
    if (!btn || !body) return;
    btn.classList.add('expanded'); 
    btn.setAttribute('aria-expanded','true'); 
    body.style.maxHeight = body.scrollHeight + 'px';
  } catch (error) {
    console.error('[UI] Error expanding section:', id, error);
  }
}

/**
 * Collapse an accordion section by ID
 * @param {string} id - Section ID (from authSections config)
 */
function collapseSection(id) {
  try {
    const item = qs(`.acc-item[data-acc-id="${id}"]`); 
    if (!item) return;
    const btn = item.querySelector('.acc-toggle'); 
    const body = item.querySelector('.acc-body'); 
    if (!btn || !body) return;
    btn.classList.remove('expanded'); 
    btn.setAttribute('aria-expanded','false'); 
    body.style.maxHeight = '0px';
  } catch (error) {
    console.error('[UI] Error collapsing section:', id, error);
  }
}

// --- Render topbar and wire behaviors ------------------------------------
function renderTopbar(cfg = defaultConfig) {
  const topbar = qs(cfg.topbarSelector); if (!topbar) return null;
  topbar.innerHTML = '';

  // Add theme toggle
  const themeToggle = `<button id="themeToggle" class="theme-toggle" aria-label="Toggle theme">🌙</button>`;
  topbar.insertAdjacentHTML('beforeend', themeToggle + buildNavHTML(cfg) + buildAuthHTML(cfg));

  // Mobile menu button and overlay for small screens
  (function setupMobileMenu(){
    const authWrap = topbar.querySelector('.auth-topbar-wrap');
    let mobileBtn = topbar.querySelector('#mobileMenuBtn');
    if (!mobileBtn) {
      mobileBtn = document.createElement('button');
      mobileBtn.id = 'mobileMenuBtn';
      mobileBtn.className = 'mobile-menu-btn';
      mobileBtn.setAttribute('aria-label', 'Open menu');
      mobileBtn.setAttribute('aria-expanded', 'false');
      if (authWrap) topbar.insertBefore(mobileBtn, authWrap); else topbar.appendChild(mobileBtn);
    }

    // Create an overlay clone of the nav for mobile
    let mobileOverlay = document.querySelector('.mobile-nav-overlay');
    const navEl = topbar.querySelector('.topbar-links');
    if (!mobileOverlay && navEl) {
      mobileOverlay = document.createElement('div');
      mobileOverlay.className = 'mobile-nav-overlay';
      mobileOverlay.innerHTML = navEl.outerHTML;
      document.body.appendChild(mobileOverlay);
    }

    if (mobileBtn && mobileOverlay) {
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opened = mobileOverlay.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', opened ? 'true' : 'false');
      });

      mobileOverlay.addEventListener('click', (ev) => {
        const link = ev.target.closest('.topbar-link');
        if (link) {
          const href = link.getAttribute('href') || '';
          if (!href.startsWith('http') && !href.startsWith('#')) {
            ev.preventDefault(); navigateTo(href);
          } else if (href.startsWith('#')) {
            // let anchors behave normally
          } else {
            window.location.href = href;
          }
          mobileOverlay.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        } else if (ev.target === mobileOverlay) {
          mobileOverlay.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // also wire cloned links for SPA navigation
      mobileOverlay.querySelectorAll('.topbar-link').forEach(a => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (!href || href.startsWith('http') || href.startsWith('#')) return;
          e.preventDefault(); navigateTo(href);
          mobileOverlay.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        });
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > (cfg.hideNavBelowWidth || 700)) {
          if (mobileOverlay.classList.contains('open')) {
            mobileOverlay.classList.remove('open');
            mobileBtn.setAttribute('aria-expanded', 'false');
          }
        }
      });
    }
  })();

  // intercept nav links for in-app routes
  qsa(`${cfg.topbarSelector} .topbar-link`).forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;
      e.preventDefault(); navigateTo(href);
    });
  });

  const wrap = qs('.auth-topbar-wrap'); if (!wrap) return topbar;
  const toggle = wrap.querySelector('#authToggle'); const popover = wrap.querySelector('#authPopover');

  updateHeaderHeight();
  window.addEventListener('resize', () => updateHeaderHeight(cfg.headerSelector));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => updateHeaderHeight(cfg.headerSelector));

  // accordion initial state
  wrap.querySelectorAll('.acc-body').forEach(b => b.style.maxHeight = '0px');

  if (popover) { popover.style.transformOrigin = 'center top'; popover.style.left = '50%'; popover.style.right = 'auto'; }

  toggle.addEventListener('click', (ev) => { ev.stopPropagation(); updateHeaderHeight(cfg.headerSelector); toggleAuthPopover(); });

  // close when clicking outside
  document.addEventListener('click', (ev) => { if (!wrap.contains(ev.target)) closeAuthPopover(); });

  // keyboard close
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeAuthPopover(); });

  // accordion toggles
  wrap.querySelectorAll('.acc-toggle').forEach(btn => {
    const body = btn.parentElement.querySelector('.acc-body');
    btn.addEventListener('click', () => {
      const expanded = btn.classList.toggle('expanded');
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (expanded) body.style.maxHeight = body.scrollHeight + 'px'; else body.style.maxHeight = '0px';
    });
    btn.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); btn.click(); } });
  });

  return topbar;
}

/**
 * Simple privacy policy page loader.
 * Renders privacy policy in the main content area.
 * @private
 */
function loadPrivacyPolicy() {
  try {
    const mainEl = qs('main'); 
    if (!mainEl) return;
    const policyHTML = `
      <article class="privacy-policy card">
        <h1>Privacy Policy</h1>
        <p><strong>Effective Date:</strong> April 30, 2026</p>
        <h2>1. Introduction</h2>
        <p>Welcome to <strong>Space School</strong>. This application is an educational project developed by Omar Mohamed Farouk for the International Baccalaureate (IB) program.</p>
        <h2>2. Data Collection</h2>
        <p>We collect minimal data necessary for core features, including email addresses for authentication via Firebase and task progress for the dashboard.</p>
        <h2>3. Third-Party Services</h2>
        <p>We use Firebase (Authentication/Database) and Netlify (Hosting). Please refer to their official policies for data handling.</p>
        <h2>4. Academic Purpose</h2>
        <p>This is a non-commercial school project. We do not sell or share your data.</p>
        <button id="backToDashboard">Back to Dashboard</button>
      </article>`;
    mainEl.innerHTML = policyHTML;
    const back = qs('#backToDashboard'); 
    if (back) {
      back.addEventListener('click', () => location.reload());
    }
  } catch (error) {
    console.error('[UI] Error loading privacy policy:', error);
  }
}

// --- Theme Toggle Functionality -----------------------------------------
function initThemeToggle() {
  const toggle = qs('#themeToggle');
  if (!toggle) return;

  // Get saved theme or default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const toggle = qs('#themeToggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

// --- Initialization & public API -----------------------------------------
function initUI(cfg = {}) {
  const config = Object.assign({}, defaultConfig, cfg);
  renderTopbar(config);
  initThemeToggle();
  registerDefaultRoutes();
  return {
    openAuthPopover, closeAuthPopover, toggleAuthPopover,
    expandSection, collapseSection,
    registerRoute, navigateTo, updateHeaderHeight
  };
}

// Auto-init and expose API
window.UI = initUI();

// Module exports for other modules
export { initUI, registerRoute, navigateTo, openAuthPopover, closeAuthPopover, expandSection, collapseSection };
