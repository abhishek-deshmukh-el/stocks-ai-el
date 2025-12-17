import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentPrice } from "@/lib/stock-api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Symbol is required" },
        { status: 400 }
      );
    }

    const price = await fetchCurrentPrice(symbol);

    return NextResponse.json({
      success: true,
      symbol,
      price,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching stock price:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stock price",
      },
      { status: 500 }
    );
  }
}
