import { NextRequest, NextResponse } from "next/server";
import { batchCheckAllStocks } from "@/lib/stock-alert-service";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/cron/check-prices
 * Cron job endpoint to check all stock prices and send notifications
 *
 * This should be called by a cron service like:
 * - Vercel Cron Jobs
 * - GitHub Actions (scheduled workflow)
 * - External cron service (cron-job.org, etc.)
 *
 * Example with Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-prices",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting scheduled price check...");

    const user = getCurrentUser();

    console.log("🚀 ~ GET ~ user:", user);

    if (!user || !user.phoneNumber) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    const result = await batchCheckAllStocks(user.phoneNumber);

    console.log(
      `✅ Price check completed: ${result.checkedCount} stocks checked, ${result.notificationsSent} notifications sent`
    );

    return NextResponse.json({
      success: true,
      message: "Price check completed",
      checkedCount: result.checkedCount,
      notificationsSent: result.notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Cron job error:", error);
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
 * POST /api/cron/check-prices
 * Manual trigger for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    console.log("🔄 Starting manual price check for user:", phoneNumber);

    const result = await batchCheckAllStocks(phoneNumber);

    console.log(
      `✅ Price check completed: ${result.checkedCount} stocks checked, ${result.notificationsSent} notifications sent`
    );

    return NextResponse.json({
      success: true,
      message: "Price check completed",
      checkedCount: result.checkedCount,
      notificationsSent: result.notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Manual price check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
