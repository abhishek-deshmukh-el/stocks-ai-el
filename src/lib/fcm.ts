/**
 * Firebase Cloud Messaging (FCM) Service
 * Server-side notification sending using Firebase Admin SDK
 */

import * as admin from "firebase-admin";
import { getCurrencySymbol, Region } from "./constants";

// Initialize Firebase Admin
let firebaseAdmin: admin.app.App;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebaseAdmin() {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      firebaseAdmin = admin.apps[0]!;
      return firebaseAdmin;
    }

    // Get service account credentials from environment
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error(
        "Firebase credentials not configured. Please set FIREBASE_SERVICE_ACCOUNT_JSON environment variable."
      );
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const credential = admin.credential.cert(serviceAccount);

    firebaseAdmin = admin.initializeApp({
      credential,
    });

    console.log("✅ Firebase Admin SDK initialized");
    return firebaseAdmin;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

/**
 * Send push notification to a specific token
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    initializeFirebaseAdmin();

    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Push notification sent successfully:", response);
    return true;
  } catch (error) {
    console.error("❌ Failed to send push notification:", error);
    return false;
  }
}

/**
 * Send push notification to multiple tokens
 */
export async function sendMulticastPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  try {
    if (tokens.length === 0) {
      console.warn("⚠️ No tokens provided for multicast notification");
      return { successCount: 0, failureCount: 0 };
    }

    initializeFirebaseAdmin();

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(
      `✅ Multicast notification sent: ${response.successCount} successful, ${response.failureCount} failed`
    );

    // Log failed tokens and errors for debugging
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Token ${idx} failed:`, {
            token: tokens[idx],
            error: resp.error?.code,
            message: resp.error?.message,
          });
        }
      });
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("❌ Failed to send multicast notification:", error);
    return { successCount: 0, failureCount: tokens.length };
  }
}

/**
 * Send stock price alert notification
 */
export async function sendStockAlertNotification(
  tokens: string[],
  stockSymbol: string,
  currentPrice: number,
  alertPrice: number,
  region: Region
): Promise<{ successCount: number; failureCount: number }> {
  const currency = getCurrencySymbol(region === Region.US ? "AAPL" : "RELIANCE");

  const title = `🔔 ${stockSymbol} Price Alert`;
  const body = `${stockSymbol} has reached ${currency}${currentPrice.toFixed(2)}! Target was ${currency}${alertPrice.toFixed(2)}.`;

  return sendMulticastPushNotification(tokens, title, body, {
    symbol: stockSymbol,
    currentPrice: currentPrice.toString(),
    alertPrice: alertPrice.toString(),
    region,
    type: "price_alert",
  });
}

/**
 * Send stock volatility alert notification
 */
export async function sendVolatilityAlertNotification(
  tokens: string[],
  stockSymbol: string,
  currentPrice: number,
  stopLoss: number,
  stopLossPercentage: number,
  atr: number,
  recommendation: string,
  region: Region
): Promise<{ successCount: number; failureCount: number }> {
  const currency = getCurrencySymbol(region === Region.US ? "AAPL" : "RELIANCE");

  const title = `⚠️ ${stockSymbol} Volatility Alert`;
  const body = `Current: ${currency}${currentPrice.toFixed(2)} | Stop Loss: ${currency}${stopLoss.toFixed(2)} (${stopLossPercentage.toFixed(2)}%) | ${recommendation}`;

  return sendMulticastPushNotification(tokens, title, body, {
    symbol: stockSymbol,
    currentPrice: currentPrice.toString(),
    stopLoss: stopLoss.toString(),
    stopLossPercentage: stopLossPercentage.toString(),
    atr: atr.toString(),
    recommendation,
    region,
    type: "volatility_alert",
  });
}

/**
 * Validate and clean up invalid FCM tokens
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    initializeFirebaseAdmin();

    // Try to send a dry run message
    await admin.messaging().send(
      {
        token,
        data: { test: "true" },
      },
      true // dry run
    );
    return true;
  } catch (error: any) {
    // Token is invalid if error code is registration-token-not-registered or invalid-registration-token
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      return false;
    }
    // For other errors, assume token is still valid
    return true;
  }
}
