import { NextResponse } from "next/server";
import { stockOrchestrator } from "@/lib/services/stock-orchestrator.service";

/**
 * API Route: Get Stock Recommendations
 * GET /api/stock/recommendations?symbol=TSLA
 *
 * Returns analyst recommendations (buy/hold/sell) for a stock
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Symbol parameter is required" },
        { status: 400 }
      );
    }

    const recommendations = await stockOrchestrator.fetchRecommendations(symbol);

    return NextResponse.json({
      success: true,
      symbol,
      recommendations,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch recommendations",
      },
      { status: 500 }
    );
  }
}
