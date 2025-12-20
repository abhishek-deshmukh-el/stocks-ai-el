import { NextRequest, NextResponse } from "next/server";
import { stockOrchestrator } from "@/lib/services/stock-orchestrator.service";

export async function POST(request: NextRequest) {
  try {
    const { stocks } = await request.json();

    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return NextResponse.json(
        { success: false, error: "Stocks array is required" },
        { status: 400 }
      );
    }

    // Fetch all recommendations in parallel
    const recommendationPromises = stocks.map(
      async (stock: { symbol: string; region: "US" | "INDIA" }) => {
        try {
          const recommendations = await stockOrchestrator.fetchRecommendations(
            stock.symbol,
            stock.region
          );
          return {
            symbol: stock.symbol,
            region: stock.region,
            recommendations,
            success: true,
            fetchedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.error(
            `Error fetching recommendations for ${stock.symbol} (${stock.region}):`,
            error
          );
          return {
            symbol: stock.symbol,
            region: stock.region,
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch recommendations",
          };
        }
      }
    );

    const results = await Promise.all(recommendationPromises);

    return NextResponse.json({
      success: true,
      results,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in batch recommendations fetch:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch batch recommendations",
      },
      { status: 500 }
    );
  }
}
