import { NextResponse } from "next/server";
import { STOCK_WATCHLIST } from "@/lib/constants";

/**
 * API Route: Get Stock Watchlist
 * GET /api/watchlist
 *
 * Returns the current stock watchlist
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    count: STOCK_WATCHLIST.length,
    stocks: STOCK_WATCHLIST,
  });
}

/**
 * POST /api/watchlist
 * Add a stock to the watchlist (for future implementation)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // For now, just return the received data
    // In production, you'd save this to a database
    return NextResponse.json({
      success: true,
      message: "Stock watchlist update received (demo mode)",
      stock: body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid request",
      },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/watchlist
 * Update a stock in the watchlist (for future implementation)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { symbol, ...updates } = body;

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol is required" }, { status: 400 });
    }

    // In production, you'd update this in a database
    return NextResponse.json({
      success: true,
      message: `Stock ${symbol} updated (demo mode)`,
      stock: body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid request",
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/watchlist
 * Remove a stock from the watchlist (for future implementation)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol is required" }, { status: 400 });
    }

    // In production, you'd delete this from a database
    return NextResponse.json({
      success: true,
      message: `Stock ${symbol} removed (demo mode)`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid request",
      },
      { status: 400 }
    );
  }
}
