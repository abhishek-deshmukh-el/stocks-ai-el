import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { Region } from "@/lib/constants";

/**
 * API Route: Get Stock Watchlist
 * GET /api/watchlist?userId=xxx
 *
 * Returns the current stock watchlist for a user (combined US and India stocks)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Combine both US and India stocks
    const allStocks = [...(user.usStocks || []), ...(user.indiaStocks || [])];

    return NextResponse.json({
      success: true,
      count: allStocks.length,
      stocks: allStocks,
    });
  } catch (error: any) {
    console.error("Get watchlist error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/watchlist
 * Add a stock to the watchlist
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, stock } = body;

    if (!userId || !stock) {
      return NextResponse.json(
        { success: false, error: "userId and stock are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Add stock to appropriate array based on region
    if (stock.region === Region.US) {
      // Check if stock already exists
      const exists = user.usStocks.some((s: any) => s.symbol === stock.symbol);
      if (exists) {
        return NextResponse.json(
          { success: false, error: "Stock already exists in watchlist" },
          { status: 400 }
        );
      }
      user.usStocks.push(stock);
    } else if (stock.region === Region.INDIA) {
      // Check if stock already exists
      const exists = user.indiaStocks.some((s: any) => s.symbol === stock.symbol);
      if (exists) {
        return NextResponse.json(
          { success: false, error: "Stock already exists in watchlist" },
          { status: 400 }
        );
      }
      user.indiaStocks.push(stock);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid region. Must be Region.US or Region.INDIA" },
        { status: 400 }
      );
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Stock added successfully",
      stock: stock,
    });
  } catch (error) {
    console.error("Add stock error:", error);
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
 * Update a stock in the watchlist
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, symbol, stock } = body;

    if (!userId || !symbol || !stock) {
      return NextResponse.json(
        { success: false, error: "userId, symbol, and stock are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Find and update stock in appropriate array based on region
    let updated = false;

    if (stock.region === Region.US) {
      const index = user.usStocks.findIndex((s: any) => s.symbol === symbol);
      if (index !== -1) {
        user.usStocks[index] = stock;
        updated = true;
      }
    } else if (stock.region === Region.INDIA) {
      const index = user.indiaStocks.findIndex((s: any) => s.symbol === symbol);
      if (index !== -1) {
        user.indiaStocks[index] = stock;
        updated = true;
      }
    }

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Stock not found in watchlist" },
        { status: 404 }
      );
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: `Stock ${symbol} updated successfully`,
      stock: stock,
    });
  } catch (error) {
    console.error("Update stock error:", error);
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
 * Remove a stock from the watchlist
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const symbol = searchParams.get("symbol");

    if (!userId || !symbol) {
      return NextResponse.json(
        { success: false, error: "userId and symbol are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Try to remove from US stocks
    const usIndex = user.usStocks.findIndex((s: any) => s.symbol === symbol);
    if (usIndex !== -1) {
      user.usStocks.splice(usIndex, 1);
      await user.save();
      return NextResponse.json({
        success: true,
        message: `Stock ${symbol} removed successfully`,
      });
    }

    // Try to remove from India stocks
    const indiaIndex = user.indiaStocks.findIndex((s: any) => s.symbol === symbol);
    if (indiaIndex !== -1) {
      user.indiaStocks.splice(indiaIndex, 1);
      await user.save();
      return NextResponse.json({
        success: true,
        message: `Stock ${symbol} removed successfully`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Stock not found in watchlist" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Delete stock error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid request",
      },
      { status: 400 }
    );
  }
}
