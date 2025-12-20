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

    // Fetch all prices in parallel
    const pricePromises = stocks.map(async (stock: { symbol: string; region: string }) => {
      try {
        const price = await stockOrchestrator.fetchCurrentPrice(stock.symbol);
        return {
          symbol: stock.symbol,
          region: stock.region,
          price,
          success: true,
          fetchedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Error fetching price for ${stock.symbol} (${stock.region}):`, error);
        return {
          symbol: stock.symbol,
          region: stock.region,
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch price",
        };
      }
    });

    const results = await Promise.all(pricePromises);

    return NextResponse.json({
      success: true,
      results,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in batch price fetch:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch batch prices",
      },
      { status: 500 }
    );
  }
}
