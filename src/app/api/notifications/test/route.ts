/**
 * Test Notification Endpoint
 * Send a test notification to verify FCM is working
 *
 * Usage: POST /api/notifications/test
 * Body: { phoneNumber: string }
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { sendMulticastPushNotification } from "@/lib/fcm";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      return NextResponse.json(
        { success: false, error: "No FCM tokens found for this user" },
        { status: 404 }
      );
    }

    // Send test notification
    const result = await sendMulticastPushNotification(
      user.fcmTokens,
      "🧪 Test Notification",
      `This is a test notification sent at ${new Date().toLocaleTimeString()}. If you can see this, FCM is working! 🎉`,
      {
        type: "test",
        timestamp: Date.now().toString(),
      }
    );

    console.log(
      `✅ Test notification sent to ${phoneNumber}: ${result.successCount} success, ${result.failureCount} failed`
    );

    return NextResponse.json({
      success: true,
      message: "Test notification sent",
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalTokens: user.fcmTokens.length,
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
