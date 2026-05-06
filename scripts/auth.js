/**
 * @fileoverview Firebase Authentication Module for Solar School
 * Provides OAuth and passwordless sign-in flows with advanced persistence.
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
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { 
  doc,
  enableIndexedDbPersistence,
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  getCountFromServer,
  runTransaction,
  collectionGroup
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

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
const db = getFirestore(app);

// Enable offline persistence for PWA support
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn('[Firestore] Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('[Firestore] Persistence unimplemented');
    }
  });
}

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
  const actionCodeSettings = {
    // Point directly to the folder where the file lives
    url: 'https://spaceyschool.netlify.app/pages/signin.html', 
    handleCodeInApp: true,
  };
  
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem('emailForSignIn', email);
}

/**
 * Complete passwordless sign-in if the current URL contains a sign-in link.
 * Call this on page load to handle email link authentication.
 * @async 
 * @param {string} [manualEmail] - Email provided via UI input to avoid prompts
 * @returns {Promise<UserCredential|null>} User credential if valid, null otherwise
 */
export async function handleEmailLinkSignIn(manualEmail = null) {
  try {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = manualEmail || window.localStorage.getItem('emailForSignIn');
      
      if (!email) {
        return { needsEmail: true };
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

/**
 * Sync game statistics to Firestore based on user schema.
 * @param {Object} stats - The stats to update (coins, correctAnswers, etc.)
 */
export async function updateGameStats(stats) {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const statsRef = doc(db, "GameStats", uid);

  try {
    // Using setDoc with { merge: true } is more robust for offline scenarios
    // as it combines the creation and update logic into a single operation
    // that Firestore can easily queue.
    
    const currentStats = await getDoc(statsRef).catch(() => null);
    const currentHighScore = currentStats?.exists() ? (currentStats.data().highScore || 0) : 0;

    const dataToUpdate = {
      userId: uid,
      coins: increment(stats.coins || 0),
      totalQuestionsAnswered: increment(stats.questions || 0),
      correctAnswers: increment(stats.correct || 0),
      highScore: Math.max(currentHighScore, stats.score || 0)
    };

    // If document doesn't exist, provide initial values for new fields
    if (!currentStats?.exists()) {
      dataToUpdate.planetsDiscovered = stats.planets || 0;
      dataToUpdate.constellationsUnlocked = 0;
    }

    await setDoc(statsRef, dataToUpdate, { merge: true });
  } catch (error) {
    console.error("[Auth] Error updating game stats:", error);
  }
}

/**
 * Get current user stats
 */
export async function getPlayerStats() {
  if (!auth.currentUser) return null;
  try {
    const snap = await getDoc(doc(db, "GameStats", auth.currentUser.uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn("[Auth] Using cached stats (offline)");
    return null; // Logic in main.js will handle null by showing cached or default UI
  }
}

/**
 * Fetch top 5 high scores from GameStats collection.
 * @async
 * @returns {Promise<Array>} Array of top player stats
 */
export async function getLeaderboard() {
  try {
    const q = query(collection(db, "GameStats"), orderBy("highScore", "desc"), limit(5));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch (error) {
    console.error("[Auth] Error fetching leaderboard:", error);
    return [];
  }
}

/**
 * Calculate the global rank of a specific user based on their high score.
 * @async
 * @param {string} uid - User ID
 * @returns {Promise<number|null>} The rank number or null if stats don't exist
 */
export async function getUserRank(uid) {
  try {
    const stats = await getPlayerStats();
    if (!stats || stats.highScore === undefined) return null;
    
    const score = stats.highScore;
    const q = query(collection(db, "GameStats"), where("highScore", ">", score));
    
    // getCountFromServer requires an active connection. 
    // We wrap it to prevent crashes when offline.
    if (!navigator.onLine) return null;
    
    const snap = await getCountFromServer(q);
    // Rank is (number of people with higher score) + 1
    return snap.data().count + 1;
  } catch (error) {
    console.error("[Auth] Error fetching rank:", error);
    return null;
  }
}

/**
 * Fetch counts and averages for Dashboard Widgets
 */
export async function getDashboardData(uid) {
  try {
    const stats = await getPlayerStats();
    const rank = await getUserRank(uid);
    
    // Count created missions
    const missionsQ = query(collection(db, "UserGames"), where("creatorId", "==", uid));
    const missionsSnap = await getCountFromServer(missionsQ);
    
    // Calculate Reading Progress & Avg Score
    const progressQ = query(collection(db, "UserModuleProgress"), where("userId", "==", uid));
    const progressSnap = await getDocs(progressQ);
    
    let totalScore = 0;
    let completedCount = 0;
    progressSnap.forEach(doc => {
      totalScore += doc.data().score || 0;
      if (doc.data().completed) completedCount++;
    });

    return {
      stats,
      rank,
      createdCount: missionsSnap.data().count,
      avgScore: progressSnap.size > 0 ? Math.round(totalScore / progressSnap.size) : 0,
      readingLevel: completedCount
    };
  } catch (e) {
    console.error("[Auth] Dashboard data fetch failed:", e);
    return null;
  }
}

/**
 * Solar Studio: Save custom mission to Firestore
 */
export async function saveUserGame(missionData) {
    if (!auth.currentUser) return;
    try {
        const docRef = doc(collection(db, "UserGames"));
        await setDoc(docRef, {
            ...missionData,
            creatorId: auth.currentUser.uid,
            creatorName: auth.currentUser.displayName || 'Anonymous Explorer',
            createdAt: serverTimestamp()
        });
        
        // Reward for creative contribution
        await updateGameStats({ coins: 50 });
        
        return true;
    } catch (e) {
        console.error("[Studio] Save failed:", e);
        return false;
    }
}

export async function getCommunityGames() {
    const q = query(collection(db, "UserGames"), orderBy("createdAt", "desc"), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
}

/**
 * Save user progress for a learning module.
 * @param {string} moduleId - ID of the module (e.g., 'astronomy_1')
 * @param {number} score - Quiz score (0-100)
 */
export async function saveModuleProgress(moduleId, score) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const progressId = `${uid}_${moduleId}`;
    const progressRef = doc(db, "UserModuleProgress", progressId);

    try {
        const snap = await getDoc(progressRef);
        const isCompleted = score >= 70; 
        
        const data = {
            learningModuleId: moduleId,
            userId: uid,
            score: score,
            lastAttemptedAt: serverTimestamp()
        };

        if (isCompleted) {
            data.completed = true;
            data.completionDate = serverTimestamp();
        }

        if (!snap.exists()) {
            data.bestScore = score;
            await setDoc(progressRef, data);
        } else {
            const currentBest = snap.data().bestScore || 0;
            data.bestScore = Math.max(currentBest, score);
            await updateDoc(progressRef, data);
        }
        
        // Reward for performance and sync to global statistics
        const reward = score >= 90 ? 25 : (score >= 70 ? 10 : 0);
        await updateGameStats({ 
            coins: reward,
            correct: isCompleted ? 1 : 0,
            questions: 1 
        });

    } catch (error) {
        console.error("[Auth] Error saving module progress:", error);
    }
}

/**
 * Log a page view or event for internal analytics.
 * @param {string} eventName - The event to track (e.g., 'page_view_home')
 */
export async function trackEvent(eventName) {
    const eventRef = doc(db, "SystemAnalytics", eventName);
    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(eventRef);
            if (!snap.exists()) {
                transaction.set(eventRef, { count: 1, lastOccurred: serverTimestamp() });
            } else {
                transaction.update(eventRef, { 
                    count: increment(1), 
                    lastOccurred: serverTimestamp() 
                });
            }
        });
    } catch (e) {
        console.error("[Analytics] Tracking failed:", e);
    }
}

/**
 * Fetch all analytics data for the Admin Dashboard.
 */
export async function getAnalyticsData() {
    try {
        const q = query(collection(db, "SystemAnalytics"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("[Analytics] Fetch failed:", e);
        return [];
    }
}

// Export singleton auth instance for use in other modules
export { auth, db, onAuthStateChanged };