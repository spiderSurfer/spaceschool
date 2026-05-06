/**
 * @fileoverview Main Application Module
 * Handles DOM initialization, auth event bindings, and UI updates based on auth state.
 * Coordinates between Firebase auth module and UI components.
 */

import './ui.js';
import './backend.js';
import './path-utils.js';
import { SpaceGame2D } from './games-engine.js';
import { initAdmin, displayPosts } from './admin.js';
import {
	auth,
	signInWithGoogle,
	signInWithEmail,
	createUserWithEmail,
	sendPasswordlessSignInLink,
	handleEmailLinkSignIn,
	signOutUser,
	saveModuleProgress,
	trackEvent,
    getDashboardData,
    saveUserGame
} from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// Global Title Sync
document.title = `Solar School | ${document.title.split('|').pop().trim()}`;
const brandH1 = document.querySelector('header h1');
if (brandH1) brandH1.textContent = brandH1.textContent.replace('Space School', 'Solar School');

/**
 * Automated Horizontal Mode Support for Service Worker / Mobile
 */
/**
 * Initialize UI event handlers when DOM is ready.
 * Binds click/submit handlers to all authentication forms and buttons.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Analytics: Track page visit
    const pageName = window.location.pathname.split('/').pop() || 'home';
    trackEvent(`view_${pageName.replace('.html', '')}`);

	const statusEl = document.getElementById('auth-status');
	const signOutBtn = document.getElementById('signOutBtn');
	const googleBtn = document.getElementById('googleSignInBtn');

    /**
     * Game Maker: Publish Mission
     */
    const publishBtn = document.getElementById('publish-mission-btn');
    if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
            const missionTitle = document.getElementById('mission-title')?.value;
            const missionData = document.getElementById('mission-json')?.value;

            if (!missionTitle || !missionData) {
                window.UI.showToast('Please provide a title and mission data.', 'error');
                return;
            }

            publishBtn.disabled = true;
            publishBtn.textContent = 'Syncing to Firebase...';
            
            const success = await saveUserGame({ title: missionTitle, config: JSON.parse(missionData) });
            if (success) {
                window.UI.showToast('Mission Published to Solar System!', 'success');
            }
            publishBtn.disabled = false;
            publishBtn.textContent = 'Publish Mission';
        });
    }

	/**
	 * Global Quiz Submission Helper
	 */
	window.submitQuiz = async (moduleId, score) => {
		try {
			await saveModuleProgress(moduleId, score);
			window.UI.showToast(`Quiz submitted! Score: ${score}%`, 'success');
		} catch (e) {
			window.UI.showToast('Failed to sync score.', 'error');
		}
	};

	/**
	 * Game Studio Loader
	 * Handles the transition to the mission creation interface.
	 */
	window.loadGameStudio = async () => {
		console.log("[Studio] Initializing Mission Control...");
		const user = auth.currentUser;
		
		if (!user) {
			window.UI.showToast('Unauthorized access. Please sign in to create missions.', 'error');
			if (window.UI.openAuthPopover) window.UI.openAuthPopover();
			return;
		}

		// Navigate to the creation tool or render the studio UI
		if (window.location.pathname.includes('creationtool.html')) {
			console.log("[Studio] Creation tool already active.");
		} else {
			window.location.href = '/pages/Courses/test/creationtool.html';
			return;
		}

		// Create a basic Studio UI if we are on a page that supports it
		const container = document.getElementById('studio-container') || document.querySelector('main');
		if (container) {
			container.innerHTML = `
				<section class="content-block studio-interface">
					<h2>🛠️ Mission Builder</h2>
					<p>Welcome, Architect <strong>${user.displayName || 'Explorer'}</strong>. Create your custom solar mission below.</p>
					<div class="card" style="background: var(--glass); padding: 20px;">
						<input type="text" id="mission-title" placeholder="Mission Name (e.g., Nebula Run)" style="width:100%; margin-bottom:15px;">
						<textarea id="mission-json" placeholder='{"difficulty": "hard", "entities": 50}' style="width:100%; height:150px; font-family: monospace; margin-bottom:15px;"></textarea>
						<button id="publish-mission-btn" class="btn-primary" style="width:100%">Publish to Community</button>
					</div>
					<div id="studio-preview" style="margin-top:20px;"></div>
				</section>
			`;

			// Re-bind the publish button since we just injected it
			const pubBtn = document.getElementById('publish-mission-btn');
			pubBtn.addEventListener('click', async () => {
				const title = document.getElementById('mission-title').value;
				const config = document.getElementById('mission-json').value;
				if (!title || !config) return window.UI.showToast('Fill in all fields!', 'error');
				
				pubBtn.disabled = true;
				const success = await saveUserGame({ title, config: JSON.parse(config) });
				if (success) {
					window.UI.showToast('Mission Published!', 'success');
					pubBtn.disabled = false;
				}
			});
		}
	};

	/**
	 * Automated Quiz Handler
	 * Scans for a form with id "quiz-form" and processes results.
	 * Highlights correct/incorrect choices and syncs score to Firebase.
	 */
	const quizForm = document.getElementById('quiz-form');
	if (quizForm) {
		const timeLimit = parseInt(quizForm.dataset.timeLimit) || 60;
		const timerDisplay = document.getElementById('quiz-timer');
		let timeLeft = timeLimit;

		const timerInterval = setInterval(() => {
			timeLeft--;
			if (timerDisplay) timerDisplay.textContent = `Mission Time: ${timeLeft}s`;
			if (timeLeft <= 0) {
				clearInterval(timerInterval);
				if (timerDisplay) timerDisplay.textContent = "TIME EXPIRED!";
				quizForm.requestSubmit();
			}
		}, 1000);

		quizForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			clearInterval(timerInterval);
			const moduleId = quizForm.dataset.moduleId || pageName.replace('.html', '');
			const questions = quizForm.querySelectorAll('.quiz-question');
			
			if (questions.length === 0) return;

			let correctCount = 0;
			questions.forEach(q => {
				const selected = q.querySelector('input:checked');
				const correctAnswer = q.dataset.answer;
				
				// Visual feedback: Highlight correct/incorrect answers
				q.querySelectorAll('label').forEach(label => {
					const input = label.querySelector('input');
					if (input.value === correctAnswer) {
						label.style.color = 'var(--accent-2)'; // Success color
						label.style.fontWeight = 'bold';
					} else if (input.checked) {
						label.style.color = '#ff4444'; // Error color
					}
					input.disabled = true;
				});

				if (selected && selected.value === correctAnswer) correctCount++;
			});

			const score = Math.round((correctCount / questions.length) * 100);
			
			// UI: Hide form and show results
			quizForm.style.display = 'none';
			const resultsDiv = document.getElementById('quiz-results');
			const scoreEl = document.getElementById('animated-score');
			if (resultsDiv) resultsDiv.style.display = 'block';

			// Score Animation Logic
			if (scoreEl) {
				let current = 0;
				const duration = 1500; // 1.5 seconds
				const start = performance.now();

				const animate = (now) => {
					const progress = Math.min((now - start) / duration, 1);
					current = Math.floor(progress * score);
					scoreEl.textContent = `${current}%`;
					if (progress < 1) requestAnimationFrame(animate);
				};
				requestAnimationFrame(animate);
			}

			// Share Link Logic
			const shareBtn = document.getElementById('share-quiz-btn');
			if (shareBtn) {
				const shareText = encodeURIComponent(`I scored ${score}% on the ${moduleId.replace('_', ' ')} quiz at Solar School! Can you beat my score? 🚀`);
				const shareUrl = encodeURIComponent(window.location.href);
				shareBtn.href = `https://wa.me/?text=${shareText}%20${shareUrl}`;
			}

			// Show Next Lesson button if score >= 80%
			if (score >= 80) {
				const nextBtn = document.getElementById('next-lesson-btn');
				if (nextBtn && quizForm.dataset.nextLesson) {
					nextBtn.href = quizForm.dataset.nextLesson;
					nextBtn.style.display = 'inline-block';
				}
			}

			// Review Answers Logic
			const reviewBtn = document.getElementById('review-quiz-btn');
			if (reviewBtn) {
				reviewBtn.addEventListener('click', () => {
					quizForm.style.display = 'block';
					resultsDiv.style.display = 'none';
					quizForm.scrollIntoView({ behavior: 'smooth' });

					questions.forEach(q => {
						let exp = q.querySelector('.quiz-explanation');
						if (!exp) {
							exp = document.createElement('div');
							exp.className = 'quiz-explanation';
							exp.style.cssText = 'margin-top: 1rem; padding: 1rem; border-radius: 8px; background: rgba(255,255,255,0.05); border-left: 4px solid var(--accent);';
							q.appendChild(exp);
						}
						const selected = q.querySelector('input:checked');
						const isCorrect = selected && selected.value === q.dataset.answer;
						
						exp.innerHTML = `
							<div style="color: ${isCorrect ? 'var(--accent-2)' : '#ff4444'}; font-weight: bold; margin-bottom: 0.5rem;">
								${isCorrect ? '✓ Correct Intelligence' : '✗ Mission Analysis'}
							</div>
							<div style="font-size: 0.9rem; line-height: 1.4;">${q.dataset.explanation || 'No further data available for this sector.'}</div>
						`;
					});
				}, { once: true });
			}

			// Sync to Firebase
			await window.submitQuiz(moduleId, score);
			trackEvent(`quiz_completed_${moduleId}`);
			
			if (window.UI) window.UI.showToast(`Mission Accomplished: ${score}%`, 'success');
		});
	}

	// Initialize Action Cards Dashboard
	if (window.UI && typeof window.UI.renderActionCards === 'function') {
		window.UI.renderActionCards('#dashboard-grid');
	} else if (document.querySelector('.action-grid-placeholder')) {
        // Fallback for direct injection
    }

	const emailForm = document.getElementById('emailSignInForm');
	const createForm = document.getElementById('createAccountForm');
	const passwordlessForm = document.getElementById('passwordlessForm');

	/**
	 * Google Sign-In button handler.
	 * Opens OAuth popup for user to authenticate via Google.
	 */
	if (googleBtn) {
		googleBtn.addEventListener('click', async () => {
			try {
				await signInWithGoogle();
			} catch (e) {
				console.error('[Main] Google sign-in handler error:', e);
				window.UI.showToast(e.message || 'Google sign-in failed.', 'error');
			}
		});
	}

	/**
	 * Email/Password Sign-In form handler.
	 * Authenticates user with existing email/password account.
	 */
	if (emailForm) {
		emailForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			try {
				await signInWithEmail(email, password);
				// Clear form after successful sign-in
				emailForm.reset();
			} catch (e) {
				console.error('[Main] Email sign-in handler error:', e);
				window.UI.showToast('Sign-in failed. Check credentials.', 'error');
			}
		});
	}

	/**
	 * Create Account form handler.
	 * Registers a new user with email and password.
	 */
	if (createForm) {
		createForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const email = document.getElementById('newEmail').value;
			const password = document.getElementById('newPassword').value;
			try {
				await createUserWithEmail(email, password);
				// Clear form after successful account creation
				createForm.reset();
				window.UI.showToast('Account created! Welcome.', 'success');
			} catch (e) {
				console.error('[Main] Account creation handler error:', e);
				window.UI.showToast(e.message || 'Creation failed.', 'error');
			}
		});
	}

	/**
	 * Passwordless Sign-In form handler.
	 * Sends an email with a sign-in link to the user.
	 */
	if (passwordlessForm) {
		passwordlessForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const email = document.getElementById('passwordlessEmail').value;
			try {
				await sendPasswordlessSignInLink(email);
				passwordlessForm.reset();
				window.UI.showToast('✓ Sign-in link sent!', 'success');
			} catch (e) {
				console.error('[Main] Passwordless handler error:', e);
				window.UI.showToast('Failed to send link.', 'error');
			}
		});
	}

	/**
	 * Sign-Out button handler.
	 * Clears user session and resets UI.
	 */
	if (signOutBtn) {
		signOutBtn.addEventListener('click', async () => {
			try {
				await signOutUser();
			} catch (e) {
				console.error('[Main] Sign-out handler error:', e);
				window.UI.showToast(e.message || 'Sign-out failed.', 'error');
			}
		});
	}

	/**
	 * Handle incoming email sign-in links.
	 * If user arrives via email link, complete the sign-in process.
	 */
	try {
		await handleEmailLinkSignIn();
	} catch (e) {
		console.error('[Main] Email link handler error:', e);
		// Silent error; user may not have arrived via email link
	}

	try {
		initAdmin();
	} catch (e) {
		console.error('[Main] Admin init error:', e);
	}

	// Auto-start game engine if canvas exists
	const canvas = document.getElementById('space-canvas');
	if (canvas) {
		let engine = new SpaceGame2D('space-canvas', 'rocket');
		// Add game selector logic
		window.setGameMode = (mode) => {
			engine.mode = mode;
			engine.reset();
		};

        // Fullscreen Toggle
        const fsBtn = document.createElement('button');
        fsBtn.textContent = 'Toggle Fullscreen 📺';
        fsBtn.className = 'btn-ghost';
        fsBtn.style.margin = '10px 0';
        canvas.parentElement.insertBefore(fsBtn, canvas);
        fsBtn.addEventListener('click', () => {
            if (canvas.requestFullscreen) canvas.requestFullscreen();
        });
	}

	/**
	 * Monitor auth state changes.
	 * Updates UI elements whenever user signs in/out.
	 */
	onAuthStateChanged(auth, (user) => {
		try {
            // Dashboard Visibility
            const dashboard = document.getElementById('user-dashboard');
            if (dashboard) {
                dashboard.style.display = user ? 'block' : 'none';
                if (user && document.getElementById('welcome-msg')) {
                    document.getElementById('welcome-msg').textContent = `Welcome back, ${user.displayName || 'Explorer'}!`;
                    // Load the 6 widgets (top 3 displayed)
                    getDashboardData(user.uid).then(data => {
                        if (data && window.UI.renderDashboardWidgets) {
                            window.UI.renderDashboardWidgets(data);
                        }
                    });
                }
            }

			// Update auth status text
			if (statusEl) {
				statusEl.textContent = user 
					? `Signed in: ${user.email || user.uid}` 
					: 'Not signed in';
			}

			// Show/hide sign-out button based on auth state
			if (signOutBtn) {
				signOutBtn.style.display = user ? 'inline-block' : 'none';
			}

			/**
			 * Update topbar avatar with user's Google profile picture.
			 * Falls back to "Account" text if no photoURL available.
			 */
			const authToggle = document.getElementById('authToggle');
			if (authToggle) {
				if (user && user.photoURL) {
					authToggle.innerHTML = '';
					const img = document.createElement('img');
					img.src = user.photoURL;
					img.alt = user.displayName || user.email || 'avatar';
					img.className = 'topbar-avatar';
					authToggle.appendChild(img);
					const caret = document.createElement('span');
					caret.textContent = ' ▾';
					authToggle.appendChild(caret);
				} else {
					authToggle.textContent = 'Account ▾';
				}
			}
		} catch (error) {
			console.error('[Main] Auth state change handler error:', error);
		}
	});
});

window.addEventListener('DOMContentLoaded', displayPosts);