#!/usr/bin/env node

/**
 * Script to update firebase-messaging-sw.js with real Firebase config
 *
 * Usage:
 *   node scripts/update-service-worker.js
 *
 * This script reads your .env.local file and updates the service worker
 * with your actual Firebase configuration values.
 */

import fs from "fs";
import path from "path";

// Load environment variables from .env.local
function loadEnvFile(envPath) {
  try {
    const envContent = fs.readFileSync(envPath, "utf8");
    const env = {};

    envContent.split("\n").forEach((line) => {
      // Skip comments and empty lines
      if (line.trim().startsWith("#") || !line.trim()) return;

      // Parse key=value pairs
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        env[key] = value;
      }
    });

    return env;
  } catch (error) {
    console.error(`Error reading ${envPath}:`, error.message);
    return null;
  }
}

// Main execution
function main() {
  const rootDir = path.resolve(__dirname, "..");
  const envPath = path.join(rootDir, ".env.local");
  const swPath = path.join(rootDir, "public", "firebase-messaging-sw.js");

  // Check if .env.local exists
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.local file not found!");
    console.log("\nPlease create a .env.local file with your Firebase configuration.");
    console.log("You can copy .env.example and fill in your values:\n");
    console.log("  cp .env.example .env.local\n");
    process.exit(1);
  }

  // Load environment variables
  console.log("📖 Reading .env.local...");
  const env = loadEnvFile(envPath);

  if (!env) {
    console.error("❌ Failed to parse .env.local");
    process.exit(1);
  }

  // Extract Firebase config
  const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Validate that all required values are present
  const missingVars = Object.entries(firebaseConfig)
    .filter(([key, value]) => !value || value.startsWith("your_") || value.includes("NEXT_PUBLIC"))
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error("❌ Error: Missing or invalid Firebase configuration in .env.local:");
    missingVars.forEach((varName) => {
      console.log(`   - ${varName}`);
    });
    console.log(
      "\nPlease ensure all NEXT_PUBLIC_FIREBASE_* variables are set in your .env.local file."
    );
    process.exit(1);
  }

  // Read service worker template
  console.log("📝 Reading service worker file...");
  let swContent = fs.readFileSync(swPath, "utf8");

  // Replace placeholder values
  console.log("🔧 Updating Firebase configuration...");
  swContent = swContent
    .replace(/"NEXT_PUBLIC_FIREBASE_API_KEY"/g, `"${firebaseConfig.apiKey}"`)
    .replace(/"NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"/g, `"${firebaseConfig.authDomain}"`)
    .replace(/"NEXT_PUBLIC_FIREBASE_PROJECT_ID"/g, `"${firebaseConfig.projectId}"`)
    .replace(/"NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"/g, `"${firebaseConfig.storageBucket}"`)
    .replace(/"NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"/g, `"${firebaseConfig.messagingSenderId}"`)
    .replace(/"NEXT_PUBLIC_FIREBASE_APP_ID"/g, `"${firebaseConfig.appId}"`);

  // Write updated service worker
  fs.writeFileSync(swPath, swContent, "utf8");

  console.log("✅ Service worker updated successfully!\n");
  console.log("Firebase Configuration:");
  console.log(`   Project ID: ${firebaseConfig.projectId}`);
  console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
  console.log(`   Messaging Sender ID: ${firebaseConfig.messagingSenderId}`);
  console.log("\n⚠️  Remember to restart your dev server for changes to take effect.");
  console.log("⚠️  Do not commit the updated service worker if it contains real credentials!\n");
}

// Run the script
main();
