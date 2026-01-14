/**
 * Client-side Firebase Messaging utilities
 * Handles FCM token registration and foreground notifications
 */

import { getFirebaseMessaging, getVapidKey } from "./firebase-config";
import { getToken, onMessage } from "firebase/messaging";

/**
 * Register the Firebase Messaging Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported in this browser");
    return null;
  }

  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });

    console.log("✅ Service Worker registered:", registration.scope);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log("✅ Service Worker is ready");

    return registration;
  } catch (error) {
    console.error("❌ Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return null;
    }

    // Register service worker first
    console.log("📝 Registering service worker...");
    const registration = await registerServiceWorker();
    if (!registration) {
      console.error("❌ Failed to register service worker");
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    // Get messaging instance
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.warn("Firebase Messaging not available");
      return null;
    }

    // Get FCM token
    const vapidKey = getVapidKey();
    if (!vapidKey) {
      console.error("VAPID key not configured");
      return null;
    }

    const currentToken = await getToken(messaging, { vapidKey });

    if (currentToken) {
      console.log("✅ FCM Token obtained:", currentToken);
      return currentToken;
    } else {
      console.log("No registration token available");
      return null;
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

/**
 * Save FCM token to server
 */
export async function saveFCMToken(token: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/fcm/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        userId,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ FCM token saved to server");
      return true;
    } else {
      console.error("❌ Failed to save FCM token:", data.error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error saving FCM token:", error);
    return false;
  }
}

/**
 * Remove FCM token from server
 */
export async function removeFCMToken(token: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/fcm/token", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        userId,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ FCM token removed from server");
      return true;
    } else {
      console.error("❌ Failed to remove FCM token:", data.error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error removing FCM token:", error);
    return false;
  }
}

/**
 * Setup foreground message handler
 * Call this once when the app loads
 */
export async function setupForegroundMessageHandler() {
  try {
    // Ensure service worker is registered
    await registerServiceWorker();

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return;
    }

    // Handle foreground messages
    onMessage(messaging, (payload) => {
      console.log("📬 Foreground message received:", payload);

      const notificationTitle = payload.notification?.title || "New Notification";
      const notificationOptions = {
        body: payload.notification?.body || "",
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: payload.data,
      };

      // Show notification
      if (Notification.permission === "granted") {
        new Notification(notificationTitle, notificationOptions);
      }
    });

    console.log("✅ Foreground message handler setup complete");
  } catch (error) {
    console.error("❌ Error setting up foreground message handler:", error);
  }
}

/**
 * Check if notification permission is granted
 */
export function isNotificationPermissionGranted(): boolean {
  if (!("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

/**
 * Check if notification permission is denied
 */
export function isNotificationPermissionDenied(): boolean {
  if (!("Notification" in window)) {
    return false;
  }
  return Notification.permission === "denied";
}

/**
 * Get service worker registration status
 */
export async function getServiceWorkerStatus(): Promise<{
  registered: boolean;
  active: boolean;
  scope?: string;
  state?: string;
}> {
  if (!("serviceWorker" in navigator)) {
    return { registered: false, active: false };
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const fcmRegistration = registrations.find((reg) =>
      reg.active?.scriptURL.includes("firebase-messaging-sw.js")
    );

    if (fcmRegistration) {
      return {
        registered: true,
        active: fcmRegistration.active !== null,
        scope: fcmRegistration.scope,
        state: fcmRegistration.active?.state,
      };
    }

    return { registered: false, active: false };
  } catch (error) {
    console.error("Error checking service worker status:", error);
    return { registered: false, active: false };
  }
}
