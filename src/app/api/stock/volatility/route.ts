import { NextResponse } from "next/server";
import { calculateATR, calculateVolatilityStop } from "@/lib/volatility";
import { BATCH_CONFIG } from "@/lib/constants";
import { stockOrchestrator } from "@/lib/services/stock-orchestrator.service";

/**
 * API Route: Calculate Volatility Stop
 * GET /api/stock/volatility?symbol=AAPL&atrPeriod=14&atrMultiplier=2.0
 *
 * Calculate volatility stop for a stock using ATR
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const atrPeriod = parseInt(searchParams.get("atrPeriod") || "14");
    const atrMultiplier = parseFloat(searchParams.get("atrMultiplier") || "2.0");

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol is required" }, { status: 400 });
    }

    console.log(`📊 Calculating volatility for ${symbol}`);

    // Fetch current price
    const currentPrice = await stockOrchestrator.fetchCurrentPrice(symbol);

    // Fetch historical data
    const historicalData = await stockOrchestrator.fetchHistoricalData(
      symbol,
      BATCH_CONFIG.HISTORICAL_DAYS
    );

    // Calculate ATR
    const atr = calculateATR(historicalData, atrPeriod);

    // Calculate volatility stop
    const volatilityStop = calculateVolatilityStop(currentPrice, atr, atrMultiplier);

    console.log(`✅ Volatility calculated for ${symbol}: Stop at ${volatilityStop.stopLoss}`);

    return NextResponse.json({
      success: true,
      symbol,
      currentPrice,
      atr,
      volatilityStop,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate volatility",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stock/volatility
 * Calculate volatility for multiple stocks
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stocks } = body;

    if (!stocks || !Array.isArray(stocks)) {
      return NextResponse.json(
        { success: false, error: "Stocks array is required" },
        { status: 400 }
      );
    }

    console.log(`📊 Calculating volatility for ${stocks.length} stocks`);

    const results = [];
    const errors = [];

    for (const stock of stocks) {
      try {
        const { symbol, atrPeriod = 14, atrMultiplier = 2.0 } = stock;

        // Fetch current price
        const currentPrice = await stockOrchestrator.fetchCurrentPrice(symbol);

        // Fetch historical data
        const historicalData = await stockOrchestrator.fetchHistoricalData(
          symbol,
          BATCH_CONFIG.HISTORICAL_DAYS
        );

        // Calculate ATR
        const atr = calculateATR(historicalData, atrPeriod);

        // Calculate volatility stop
        const volatilityStop = calculateVolatilityStop(currentPrice, atr, atrMultiplier);

        results.push({
          symbol,
          currentPrice,
          atr,
          volatilityStop,
          success: true,
        });

        console.log(`✅ ${symbol}: Stop at ${volatilityStop.stopLoss}`);

        // Rate limiting delay
        await new Promise((resolve) => setTimeout(resolve, BATCH_CONFIG.API_DELAY_MS));
      } catch (error) {
        const errorMsg = `Failed to process ${stock.symbol}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`❌ ${stock.symbol}:`, error);

        results.push({
          symbol: stock.symbol,
          success: false,
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      totalProcessed: stocks.length,
      totalSuccessful: results.filter((r) => r.success).length,
      totalFailed: errors.length,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate volatility",
      },
      { status: 500 }
    );
  }
}
