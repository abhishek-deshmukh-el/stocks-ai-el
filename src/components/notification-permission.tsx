"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import {
  requestNotificationPermission,
  saveFCMToken,
  removeFCMToken,
  isNotificationPermissionGranted,
  isNotificationPermissionDenied,
  setupForegroundMessageHandler,
} from "@/lib/firebase-messaging";
import { getCurrentUser } from "@/lib/auth";

export function NotificationPermission() {
  const [permissionStatus, setPermissionStatus] = useState<
    "default" | "granted" | "denied" | "unsupported"
  >("default");
  const [isLoading, setIsLoading] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  useEffect(() => {
    // Check initial permission status
    if (!("Notification" in window)) {
      setPermissionStatus("unsupported");
      return;
    }

    if (isNotificationPermissionGranted()) {
      setPermissionStatus("granted");
    } else if (isNotificationPermissionDenied()) {
      setPermissionStatus("denied");
    } else {
      setPermissionStatus("default");
    }

    // Setup foreground message handler
    setupForegroundMessageHandler();
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      // Request permission and get token
      const token = await requestNotificationPermission();

      if (token) {
        setCurrentToken(token);
        setPermissionStatus("granted");

        // Save token to server
        const user = getCurrentUser();
        if (user) {
          await saveFCMToken(token, user.id);
        }
      } else {
        setPermissionStatus("denied");
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      if (currentToken) {
        // Remove token from server
        const user = getCurrentUser();
        if (user) {
          await removeFCMToken(currentToken, user.id);
        }
        setCurrentToken(null);
      }
      setPermissionStatus("default");
    } catch (error) {
      console.error("Error disabling notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (permissionStatus === "unsupported") {
    return (
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
              Notifications Not Supported
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Your browser doesn&apos;t support push notifications. Please use a modern browser like
              Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (permissionStatus === "denied") {
    return (
      <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">Notifications Blocked</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              You&apos;ve blocked notifications for this site. To enable them, please update your
              browser settings.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (permissionStatus === "granted") {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Notifications Enabled
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                You&apos;ll receive stock alerts even when the app is closed.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisableNotifications}
            disabled={isLoading}
          >
            Disable
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Enable Push Notifications
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Get instant alerts when your stocks hit alert prices or volatility thresholds.
            </p>
          </div>
        </div>
        <Button onClick={handleEnableNotifications} disabled={isLoading} size="sm">
          {isLoading ? "Enabling..." : "Enable"}
        </Button>
      </div>
    </Card>
  );
}
