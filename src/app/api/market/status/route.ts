import { NextResponse } from "next/server";
import { getMarketStatus } from "@/lib/market-hours";

/**
 * API Route: Get Market Status
 * GET /api/market/status
 * 
 * Returns current market status (open/closed) and next open time
 */
export async function GET() {
  try {
    const status = getMarketStatus();
    
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("API Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
