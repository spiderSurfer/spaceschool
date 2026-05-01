/**
 * Utility functions to calculate relative paths from the current page.
 * This helps nested pages resolve assets, scripts, and links without manual ../ counting.
 */

/**
 * Returns the depth of the current page relative to the project root.
 * Examples:
 * - /index.html => 0
 * - /pages/courses.html => 1
 * - /pages/Courses/astronomy/1.html => 3
 */
export function getCurrentPageDepth() {
  const pathname = window.location.pathname.replace(/\/$/, '');
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return 0;
  const lastSegment = segments[segments.length - 1];
  const isFile = /\.[^./]+$/.test(lastSegment);
  return isFile ? segments.length - 1 : segments.length;
}

/**
 * Returns a relative base path string for the current location.
 */
export function getBasePath() {
  const depth = getCurrentPageDepth();
  return depth === 0 ? './' : '../'.repeat(depth);
}

/**
 * Resolve a project-root-relative file path against the current page location.
 * @param {string} targetPath - Path relative to project root, e.g. "assets/style.css"
 * @returns {string}
 */
export function resolvePath(targetPath) {
  const base = getBasePath();
  return `${base}${targetPath.replace(/^\/+/, '')}`;
}

/**
 * Inserts a <base> tag pointing to the correct directory based on current page depth.
 */
export function applyBasePath() {
  const base = getBasePath();
  const baseEl = document.querySelector('base') || document.createElement('base');
  baseEl.setAttribute('href', base);
  if (!baseEl.parentElement) {
    document.head.prepend(baseEl);
  }
  return baseEl;
}
