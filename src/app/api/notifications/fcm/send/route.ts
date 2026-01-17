import { NextRequest, NextResponse } from "next/server";
import { sendStockAlertNotification } from "@/lib/fcm";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

/**
 * POST /api/notifications/fcm/send
 * Send FCM notification to users
 *
 * Body:
 * - userIds: string[] - Array of user IDs to notify
 * - stockSymbol: string - Stock symbol
 * - currentPrice: number - Current stock price
 * - alertPrice: number - Alert price that was hit
 * - region: Region - Stock region (Region.US or Region.INDIA)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds, stockSymbol, currentPrice, alertPrice, region } = body;

    if (!userIds || !stockSymbol || !currentPrice || !alertPrice || !region) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Get all FCM tokens for the users
    const users = await User.find({ _id: { $in: userIds } });
    const allTokens = users.flatMap((user) => user.fcmTokens);

    if (allTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No FCM tokens found for users",
        successCount: 0,
        failureCount: 0,
      });
    }

    // Send notification
    const result = await sendStockAlertNotification(
      allTokens,
      stockSymbol,
      currentPrice,
      alertPrice,
      region
    );

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${result.successCount} devices`,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (error) {
    console.error("❌ Error sending FCM notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
