/**
 * The Nest — Firebase Configuration
 *
 * Initializes Firebase with the project config from environment variables.
 * All VITE_ prefixed env vars are inlined at build time.
 *
 * Set these in your .env.local file for local dev,
 * or as Cloud Run environment variables for production.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Request the user's email and basic profile
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Force account picker to show every time — useful so users can switch accounts
googleProvider.setCustomParameters({ prompt: 'select_account' });
