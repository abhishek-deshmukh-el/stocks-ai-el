/**
 * Firebase Configuration
 * Client-side Firebase configuration
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getMessaging, Messaging, isSupported } from "firebase/messaging";

// Your Firebase configuration from Firebase Console
// Get these values from: Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase App
 */
export function initializeFirebase() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

/**
 * Get Firebase Messaging instance
 * Only works in browser environment
 */
export async function getFirebaseMessaging() {
  if (typeof window === "undefined") {
    return null;
  }

  if (messaging) {
    return messaging;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging is not supported in this browser");
      return null;
    }

    initializeFirebase();
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error("Error initializing Firebase Messaging:", error);
    return null;
  }
}

/**
 * Get VAPID Key for FCM
 */
export function getVapidKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
}
