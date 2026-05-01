/**
 * @fileoverview Firebase Authentication Module
 * Provides OAuth and passwordless sign-in flows for the Space School application.
 * 
 * SECURITY: Firebase config must be externalized for production.
 * Set these environment variables:
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 * - VITE_FIREBASE_MEASUREMENT_ID
 * 
 * For local development, use .env.local (never commit to version control).
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

/**
 * Firebase configuration object.
 * TODO: Replace with environment variables in production.
 * Current config is for development only.
 */
const firebaseConfig = {
  apiKey: "AIzaSyC2HSXVLuuyDZrxLeA8mKGKOymDzuBsh4s",
  authDomain: "spaceschooleg.firebaseapp.com",
  projectId: "spaceschooleg",
  storageBucket: "spaceschooleg.firebasestorage.app",
  messagingSenderId: "720932600163",
  appId: "1:720932600163:web:e4e2fd3b72a8360b0dbb56",
  measurementId: "G-M5QVDER8VB"
};

// Initialize Firebase app and analytics
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

/**
 * Sign in with Google using OAuth 2.0 popup flow.
 * @async
 * @returns {Promise<UserCredential>} Firebase user credential
 * @throws {Error} If authentication fails (popup blocked, network error, etc.)
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('[Auth] Google sign-in error:', error.code, error.message);
    throw new Error(`Google sign-in failed: ${error.message}`);
  }
}

/**
 * Sign in with email and password.
 * @async
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<UserCredential>} Firebase user credential
 * @throws {Error} If credentials are invalid
 */
export async function signInWithEmail(email, password) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('[Auth] Email sign-in error:', error.code, error.message);
    throw new Error(`Sign-in failed: ${error.message}`);
  }
}

/**
 * Create a new user account with email and password.
 * @async
 * @param {string} email - User's email address
 * @param {string} password - User's password (minimum 6 characters)
 * @returns {Promise<UserCredential>} Firebase user credential
 * @throws {Error} If email exists or password is weak
 */
export async function createUserWithEmail(email, password) {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('[Auth] Account creation error:', error.code, error.message);
    throw new Error(`Account creation failed: ${error.message}`);
  }
}

/**
 * Sign out the current user.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If sign-out operation fails
 */
export async function signOutUser() {
  try {
    return await signOut(auth);
  } catch (error) {
    console.error('[Auth] Sign-out error:', error.code, error.message);
    throw new Error(`Sign-out failed: ${error.message}`);
  }
}

/**
 * Send passwordless sign-in link to user's email.
 * Stores email in localStorage for link verification.
 * @async
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 */
export async function sendPasswordlessSignInLink(email) {
  try {
    const actionCodeSettings = {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  } catch (error) {
    console.error('[Auth] Passwordless link send error:', error.code, error.message);
    throw new Error(`Failed to send sign-in link: ${error.message}`);
  }
}

/**
 * Complete passwordless sign-in if the current URL contains a sign-in link.
 * Call this on page load to handle email link authentication.
 * @async
 * @returns {Promise<UserCredential|null>} User credential if valid, null otherwise
 * @throws {Error} If email is required but not provided
 */
export async function handleEmailLinkSignIn() {
  try {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      
      // Fallback: prompt user if email not in localStorage (cross-device scenario)
      if (!email) {
        email = window.prompt('Please provide your email for confirmation:');
      }
      
      if (!email) {
        throw new Error('Email is required to complete sign-in with link.');
      }
      
      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      
      // Clean up URL to remove authentication code from browser history
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      return result;
    }
    return null;
  } catch (error) {
    console.error('[Auth] Email link sign-in error:', error.message);
    throw error;
  }
}

// Export singleton auth instance for use in other modules
export { auth };