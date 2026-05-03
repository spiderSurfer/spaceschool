/**
 * @fileoverview Service Worker for Progressive Web App (PWA) Support
 * Enables offline caching, installation, and advanced app capabilities.
 * 
 * FEATURES:
 * - Cache static assets (HTML, CSS, JS, fonts) on install
 * - Network-first strategy for dynamic content (API calls)
 * - Cache-first strategy for static assets
 * - Offline fallback for navigation
 * - Update check on page load
 * 
 * For production, implement cache versioning and stale-while-revalidate patterns.
 */

const CACHE_VERSION = 'v1.0.7';
const CACHE_NAME = `space-school-${CACHE_VERSION}`;

/**
 * Static assets to cache on service worker install.
 * Add resources that should be available offline.
 * @type {string[]}
 */

const ASSETS_TO_CACHE = [
	'/',
	'/index.html',
	'/manifest.json',
	'/assets/style.css',
	'/assets/logo1-192.jpeg',
	'/assets/logo1-512.jpeg',
	'/assets/logo.png',
	'/assets/logo1.jpeg',
	'/pages/offline.html',
	'/scripts/auth.js',
	'/scripts/main.js',
	'/scripts/ui.js',
	'/scripts/backend.js',
	'/pages/courses.html',
	'/pages/faq.html',
	'/pages/astronuts.html',
	'/pages/blackhole.html',
	'/pages/dwarfplanets.html',
	'/pages/games.html',
	'/pages/join.html',
	'/pages/lab.html',
	'/pages/moon.html',
	'/pages/planets.html',
	'/pages/privacypolicy.html',
	'/pages/refuel.html',
	'/pages/settings.html',
	'/pages/signin.html',
	'/pages/solarsystem.html',
	'/pages/spacemission.html',
	'/pages/stars.html',
	'/pages/sun.html',
	'/pages/Courses/astronomy/astronomy.html',
	'/pages/Courses/astronomy/1.html',
	'/pages/Courses/astronomy/2.html',
	'/pages/Courses/astronomy/3.html',
	'/pages/Courses/astronomy/4.html',
	'/pages/Courses/astronomy/5.html',
	'/pages/Courses/technologydev/techdev.html',
	'/pages/Courses/technologydev/1.html',
	'/pages/Courses/technologydev/2.html',
	'/pages/Courses/technologydev/3.html',
	'/pages/Courses/technologydev/4.html',
	'/pages/Courses/technologydev/5.html',
	'/pages/Courses/test/techdev.html',
	'/pages/Courses/test/astronomy.html',
	'/pages/Courses/test/blackhole.html',
	'/pages/Courses/test/stars.html',
	'/pages/Courses/test/planets.html',
	'/pages/Courses/test/solarsystem.html',
	'/pages/Courses/test/missions.html',
	'/pages/Courses/test/moon.html',
	'/pages/Courses/test/creationtool.html',
	'/pages/Courses/test/techdev.html',
	'https://sketchfab.com/models/74cbeaeae2174a218fe9455d77902b5c/embed?autospin=1&autostart=1',
	'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
	'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js',
	'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js'
];

/**
 * Install event: Cache static assets when service worker is first registered.
 * If caching fails, service worker will still install and use network as fallback.
 */
self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker (robust caching)...');
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE_NAME);
		// Only attempt to cache same-origin/local assets during install to avoid addAll failures for cross-origin URLs.
		const localAssets = ASSETS_TO_CACHE.filter(u => u.startsWith('/'));
		for (const asset of localAssets) {
			try {
				const req = new Request(asset, { cache: 'no-cache' });
				const res = await fetch(req);
				if (res && res.ok) {
					await cache.put(asset, res.clone());
					console.log('[SW] Cached during install:', asset);
				} else {
					console.warn('[SW] Skipped caching (bad response):', asset, res && res.status);
				}
			} catch (err) {
				console.warn('[SW] Failed to cache during install:', asset, err);
			}
		}
		await self.skipWaiting();
	})());
});

/**
 * Activate event: Clean up old caches and claim all clients.
 */
self.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker...');
	event.waitUntil(
		caches.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((cacheName) => cacheName !== CACHE_NAME)
						.map((cacheName) => {
							console.log('[SW] Deleting old cache:', cacheName);
							return caches.delete(cacheName);
						})
				);
			})
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== 'GET') {
		return;
	}

	// For CSS and JS files: STALE-WHILE-REVALIDATE strategy
	// Serves cached version immediately while fetching the latest in the background
	if (url.origin === location.origin && (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.startsWith('/scripts/'))) {
		event.respondWith(
			caches.open(CACHE_NAME).then((cache) => {
				return cache.match(request).then((cachedResponse) => {
					const fetchPromise = fetch(request)
						.then((networkResponse) => {
							if (networkResponse && networkResponse.ok) {
								cache.put(request, networkResponse.clone());
							}
							return networkResponse;
						})
						.catch(() => {
							// Silent failure for background revalidation
						});
					if (cachedResponse) {
						console.log('[SW] Serving stale asset from cache:', url.pathname);
						return cachedResponse;
					}
					return fetchPromise;
				});
			})
		);
		return;
	}

	// For manifest, logo, assets, scripts, and page resources: CACHE-FIRST strategy
	if (
		url.pathname === '/manifest.json' ||
		url.pathname === '/assets/logo.png' ||
		url.pathname.startsWith('/assets/') ||
		url.pathname.startsWith('/scripts/') ||
		url.pathname.startsWith('/pages/') ||
		url.pathname.startsWith('/Courses/')
	) {
		event.respondWith(
			caches.match(request)
				.then((cachedResponse) => {
					if (cachedResponse) {
						return cachedResponse;
					}
					return fetch(request)
						.then((response) => {
							if (!response || response.status !== 200 || response.type === 'error') {
								return response;
							}
							const responseClone = response.clone();
							caches.open(CACHE_NAME).then((cache) => {
								cache.put(request, responseClone);
							});
							return response;
						})
						.catch(() => {
							if (request.headers.get('accept')?.includes('text/html')) {
								return caches.match('/pages/offline.html');
							}
							if (url.pathname === '/assets/logo.png') {
								return new Response(
									`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" fill="#071026"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#71c0fc" font-size="24">Space</text></svg>`,
									{
										status: 200,
										statusText: 'OK',
										headers: { 'Content-Type': 'image/svg+xml' }
										}
								);
							}
							if (url.pathname === '/manifest.json') {
								return new Response(JSON.stringify({
									name: 'Space School',
									short_name: 'Space School',
									description: 'An educational platform to inspire and educate about space',
									start_url: '/index.html',
									display: 'standalone',
									background_color: '#ffffff',
									theme_color: '#071026',
									orientation: 'portrait-primary',
									scope: '/',
									icons: [
										{ src: '/assets/logo1-192.jpeg', sizes: '192x192', type: 'image/jpeg', purpose: 'any' },
										{ src: '/assets/logo1-512.jpeg', sizes: '512x512', type: 'image/jpeg', purpose: 'any' },
										{ src: '/assets/logo1-512.jpeg', sizes: '512x512', type: 'image/jpeg', purpose: 'any maskable' }
									]
								}), {
									status: 200,
									statusText: 'OK',
									headers: { 'Content-Type': 'application/json' }
								});
							}
							return new Response('Offline - asset not cached', {
								status: 503,
								statusText: 'Service Unavailable'
							});
						})
				})
		);
		return;
	}

	// For EXTERNAL API/Backend calls (Firebase, external APIs): NETWORK-FIRST strategy
	// This includes: Firebase auth, Firestore, external CDNs, backend APIs
	if (
		url.origin !== location.origin ||
		url.pathname.startsWith('/api/') ||
		url.hostname.includes('firebase') ||
		url.hostname.includes('firebaseapp') ||
		url.hostname.includes('googleapis.com') ||
		url.hostname.includes('gstatic.com')
	) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					console.log('[SW] Network response for backend:', url.hostname, url.pathname);
					// Cache successful responses for offline fallback
					if (response.ok) {
						const responseClone = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(request, responseClone);
						});
					}
					return response;
				})
				.catch((error) => {
					console.log('[SW] Network failed for backend, checking cache:', url.pathname);
					// Return cached response if network fails
					return caches.match(request)
						.then((cachedResponse) => {
							if (cachedResponse) {
								console.log('[SW] Returning cached backend response for:', url.pathname);
								return cachedResponse;
							}
							// No cache available, return error
							console.warn('[SW] No cached data for backend API:', url.pathname);
							return new Response('Offline - backend service unavailable', {
								status: 503,
								statusText: 'Service Unavailable'
							});
						});
				})
		);
		return;
	}

	// For LOCAL SCRIPTS AND STATIC ASSETS: CACHE-FIRST strategy
	// Scripts, styles, and local assets should load from cache for reliability
	event.respondWith(
		caches.match(request)
			.then((cachedResponse) => {
				if (cachedResponse) {
					console.log('[SW] Serving from cache:', url.pathname);
					// In background, update cache from network for next load
					if (url.pathname.startsWith('/scripts/') || url.pathname.startsWith('/assets/')) {
						fetch(request)
							.then((response) => {
								if (response.ok) {
									const responseClone = response.clone();
									caches.open(CACHE_NAME).then((cache) => {
										cache.put(request, responseClone);
									});
								}
							})
							.catch(() => {
								// Silent fail on background update
							});
					}
					return cachedResponse;
				}
				
				// Asset not in cache, fetch from network
				return fetch(request)
					.then((response) => {
						console.log('[SW] Fetching from network:', url.pathname);
						if (!response || response.status !== 200 || response.type === 'error') {
							return response;
						}
						// Cache successful static responses
						const responseClone = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(request, responseClone);
						});
						return response;
					})
					.catch((error) => {
						// Network request failed and no cache available
						console.warn('[SW] Failed to fetch local asset:', url.pathname, error);
						
						// For HTML navigation requests, return offline page
						if (request.headers.get('accept')?.includes('text/html')) {
							return caches.match('/pages/offline.html')
								.then((offlineResponse) => {
									if (offlineResponse) {
										console.log('[SW] Serving offline page');
										return offlineResponse;
									}
									return new Response('Offline - unable to load page', {
										status: 503,
										statusText: 'Service Unavailable'
									});
								});
						}
						
						// For scripts, try to return cached version
						if (url.pathname.startsWith('/scripts/')) {
							return caches.match(request)
								.then((cachedScript) => {
									if (cachedScript) {
										return cachedScript;
									}
									return new Response('Offline - script not cached', {
										status: 503,
										statusText: 'Service Unavailable'
									});
								});
						}
						
						// For other assets, return generic offline response
						return new Response('Offline - asset not cached', {
							status: 503,
							statusText: 'Service Unavailable'
						});
					});
			})
	);
});

/**
 * Handle messages from clients (e.g., skip-waiting after update)
 */
self.addEventListener('message', (event) => {
	try {
		if (event.data && event.data.type === 'SKIP_WAITING') {
			self.skipWaiting();
		}
	} catch (error) {
		console.error('[SW] Message handler error:', error);
	}
});
