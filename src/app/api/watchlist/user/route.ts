/**
 * Watchlist API Routes
 * Manage user's personalized stock watchlist (embedded in User model)
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// GET - Fetch user's watchlist
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const region = searchParams.get("region"); // Filter by US or INDIA
    const isActive = searchParams.get("isActive");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let watchlist: any[] = [];

    // Get stocks based on region filter
    if (region === "US") {
      watchlist = user.usStocks || [];
    } else if (region === "INDIA") {
      watchlist = user.indiaStocks || [];
    } else {
      // Return both if no region specified
      watchlist = [...(user.usStocks || []), ...(user.indiaStocks || [])];
    }

    // Apply active filter
    if (isActive !== null) {
      const activeFilter = isActive === "true";
      watchlist = watchlist.filter((item) => item.isActive === activeFilter);
    }

    return NextResponse.json(
      {
        success: true,
        count: watchlist.length,
        watchlist,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get watchlist error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Add stock to watchlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, symbol, name, targetPrice, atrPeriod = 14, atrMultiplier = 2.0, region } = body;

    // Validate required fields
    if (!userId || !symbol || !name || !region) {
      return NextResponse.json(
        { error: "userId, symbol, name, and region are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Initialize arrays if they don't exist
    if (!user.usStocks) user.usStocks = [];
    if (!user.indiaStocks) user.indiaStocks = [];

    // Determine which array to check based on region
    const targetArray = region.toUpperCase() === "US" ? user.usStocks : user.indiaStocks;

    // Check if stock already exists
    const existingStock = targetArray.find((item) => item.symbol === symbol.toUpperCase());

    if (existingStock) {
      return NextResponse.json(
        { error: "Stock already exists in your watchlist" },
        { status: 409 }
      );
    }

    // Add new stock to watchlist using $push operator
    const newStock = {
      symbol: symbol.toUpperCase(),
      name,
      targetPrice,
      atrPeriod,
      atrMultiplier,
      region: region.toUpperCase(),
    };

    const fieldToUpdate = region.toUpperCase() === "US" ? "usStocks" : "indiaStocks";

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { [fieldToUpdate]: newStock } },
      { new: true }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Stock added to watchlist",
        watchlistItem: newStock,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Add to watchlist error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update stock in watchlist
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, symbol, ...updates } = body;

    if (!userId || !symbol) {
      return NextResponse.json({ error: "userId and symbol are required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Initialize arrays if they don't exist
    if (!user.usStocks) user.usStocks = [];
    if (!user.indiaStocks) user.indiaStocks = [];

    // Find stock in both arrays
    const usStockIndex = user.usStocks.findIndex((item) => item.symbol === symbol.toUpperCase());
    const indiaStockIndex = user.indiaStocks.findIndex(
      (item) => item.symbol === symbol.toUpperCase()
    );

    let stockIndex = -1;
    let targetArray: any[];
    let fieldToUpdate: string;

    if (usStockIndex !== -1) {
      stockIndex = usStockIndex;
      targetArray = user.usStocks;
      fieldToUpdate = "usStocks";
    } else if (indiaStockIndex !== -1) {
      stockIndex = indiaStockIndex;
      targetArray = user.indiaStocks;
      fieldToUpdate = "indiaStocks";
    } else {
      return NextResponse.json({ error: "Stock not found in watchlist" }, { status: 404 });
    }

    // Update the stock
    targetArray[stockIndex] = {
      ...targetArray[stockIndex],
      ...updates,
    };

    user.markModified(fieldToUpdate);
    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: "Watchlist updated",
        watchlistItem: targetArray[stockIndex],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update watchlist error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove stock from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const symbol = searchParams.get("symbol");

    if (!userId || !symbol) {
      return NextResponse.json({ error: "userId and symbol are required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Initialize arrays if they don't exist
    if (!user.usStocks) user.usStocks = [];
    if (!user.indiaStocks) user.indiaStocks = [];

    // Try to remove from both arrays
    const initialUsLength = user.usStocks.length;
    const initialIndiaLength = user.indiaStocks.length;

    user.usStocks = user.usStocks.filter((item) => item.symbol !== symbol.toUpperCase());
    user.indiaStocks = user.indiaStocks.filter((item) => item.symbol !== symbol.toUpperCase());

    if (
      user.usStocks.length === initialUsLength &&
      user.indiaStocks.length === initialIndiaLength
    ) {
      return NextResponse.json({ error: "Stock not found in watchlist" }, { status: 404 });
    }

    // Mark both as modified and save
    user.markModified("usStocks");
    user.markModified("indiaStocks");
    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: "Stock removed from watchlist",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete from watchlist error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
