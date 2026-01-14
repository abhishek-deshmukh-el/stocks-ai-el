import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

/**
 * POST /api/notifications/fcm/token
 * Save FCM token for a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Token and userId are required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user and add token if not already present
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Add token only if it doesn't already exist
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
      console.log(`✅ FCM token added for user ${userId}`);
    } else {
      console.log(`ℹ️ FCM token already exists for user ${userId}`);
    }

    return NextResponse.json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (error) {
    console.error("❌ Error saving FCM token:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/fcm/token
 * Remove FCM token for a user
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Token and userId are required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user and remove token
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Remove token
    user.fcmTokens = user.fcmTokens.filter((t) => t !== token);
    await user.save();

    console.log(`✅ FCM token removed for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: "FCM token removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing FCM token:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/fcm/token
 * Get all FCM tokens for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId is required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tokens: user.fcmTokens,
    });
  } catch (error) {
    console.error("❌ Error getting FCM tokens:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
