/**
 * @fileoverview Main Application Module
 * Handles DOM initialization, auth event bindings, and UI updates based on auth state.
 * Coordinates between Firebase auth module and UI components.
 */

import './ui.js';
import './backend.js';
import './path-utils.js';
import { initAdmin, displayPosts, deletePost } from './admin.js';
import {
	auth,
	signInWithGoogle,
	signInWithEmail,
	createUserWithEmail,
	sendPasswordlessSignInLink,
	handleEmailLinkSignIn,
	signOutUser
} from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

/**
 * Initialize UI event handlers when DOM is ready.
 * Binds click/submit handlers to all authentication forms and buttons.
 */
document.addEventListener('DOMContentLoaded', async () => {
	const statusEl = document.getElementById('auth-status');
	const signOutBtn = document.getElementById('signOutBtn');
	const googleBtn = document.getElementById('googleSignInBtn');
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
				alert(e.message || 'Google sign-in failed. Please try again.');
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
				alert(e.message || 'Sign-in failed. Check your credentials.');
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
				alert('Account created! You are now signed in.');
			} catch (e) {
				console.error('[Main] Account creation handler error:', e);
				alert(e.message || 'Account creation failed.');
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
				alert('✓ Sign-in link sent! Check your email to complete sign-in.');
			} catch (e) {
				console.error('[Main] Passwordless handler error:', e);
				alert(e.message || 'Failed to send sign-in link. Try again.');
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
				alert(e.message || 'Sign-out failed.');
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

	/**
	 * Monitor auth state changes.
	 * Updates UI elements whenever user signs in/out.
	 */
	onAuthStateChanged(auth, (user) => {
		try {
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
const checker = document.getElementById('AdminChecker');

checker.addEventListener('keydown', (event) => {
    // 1. Check if the pressed key is "Enter"
    if (event.key === 'Enter') {
        // 2. Run your verification logic
        if (checker.value === adminCode) {
            console.log('Access Granted!');
            // Call your function here
            renderAdminTools(document.getElementById('admintools'));
        } else {
            alert('Incorrect Code!');
        }
    }
});
window.onload = displayPosts;
window.addEventListener('DOMContentLoaded', displayPosts);