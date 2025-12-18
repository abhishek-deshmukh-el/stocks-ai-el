import { NextResponse } from "next/server";
import { getMarketStatus } from "@/lib/services/finnhub.service";

/**
 * API Route: Get Market Status
 * GET /api/market/status
 *
 * Returns current market status for US and Indian markets
 */
export async function GET() {
  try {
    const status = await getMarketStatus();

    return NextResponse.json({
      success: true,
      markets: status,
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
