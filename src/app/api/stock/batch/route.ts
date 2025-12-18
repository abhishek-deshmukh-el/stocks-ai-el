/**
 * Batch Stock Prices API Route
 * GET /api/stock/batch?symbols=RELIANCE.NS,TCS.NS,INFY.NS
 */

import { NextRequest, NextResponse } from "next/server";
import { batchFetchPrices } from "@/lib/stock-api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get("symbols");

    if (!symbolsParam) {
      return NextResponse.json({ error: "Missing required parameter: symbols" }, { status: 400 });
    }

    // Parse comma-separated symbols
    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (symbols.length === 0) {
      return NextResponse.json({ error: "No valid symbols provided" }, { status: 400 });
    }

    console.log(`📊 Batch fetching prices for: ${symbols.join(", ")}`);

    // Fetch all prices
    const prices = await batchFetchPrices(symbols);

    // Convert Map to object for JSON response
    const result: Record<string, number> = {};
    prices.forEach((price, symbol) => {
      result[symbol] = price;
    });

    return NextResponse.json({
      success: true,
      count: symbols.length,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching batch prices:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch stock prices",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
