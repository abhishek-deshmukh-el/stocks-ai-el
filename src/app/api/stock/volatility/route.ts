import { NextResponse } from "next/server";
import { calculateATR, calculateVolatilityStop } from "@/lib/volatility";
import { BATCH_CONFIG, formatPrice } from "@/lib/constants";
import { stockOrchestrator } from "@/lib/services/stock-orchestrator.service";
import { sendWhatsApp } from "@/lib/whatsapp";
import { Region } from "@/lib/constants";
import { sendVolatilityAlertNotification } from "@/lib/fcm";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

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
    const region = searchParams.get("region") as Region;
    const atrPeriod = parseInt(searchParams.get("atrPeriod") || "14");
    const atrMultiplier = parseFloat(searchParams.get("atrMultiplier") || "2.0");

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol is required" }, { status: 400 });
    }

    console.log(`📊 Calculating volatility for ${symbol}`);

    // Fetch current price
    const currentPrice = await stockOrchestrator.fetchCurrentPrice(symbol, region);

    // Fetch historical data
    const historicalData = await stockOrchestrator.fetchHistoricalData(
      symbol,
      BATCH_CONFIG.HISTORICAL_DAYS,
      region
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
    const { stocks, phoneNumber } = body;

    if (!stocks || !Array.isArray(stocks)) {
      return NextResponse.json(
        { success: false, error: "Stocks array is required" },
        { status: 400 }
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    console.log(`📊 Calculating volatility for ${stocks.length} stocks`);

    const results = [];
    const errors = [];

    for (const stock of stocks) {
      try {
        const { symbol, region = Region.US, atrPeriod = 14, atrMultiplier = 2.0 } = stock;

        // Fetch current price
        const currentPrice = await stockOrchestrator.fetchCurrentPrice(symbol, region);

        // Fetch historical data
        const historicalData = await stockOrchestrator.fetchHistoricalData(
          symbol,
          BATCH_CONFIG.HISTORICAL_DAYS,
          region
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

    // Send WhatsApp and Push Notification alerts for SELL recommendations
    const sellRecommendations = results.filter(
      (result: any) => result.success && result.volatilityStop?.recommendation === "SELL"
    );

    let alertsSent = 0;
    let pushNotificationsSent = 0;

    if (sellRecommendations.length > 0) {
      console.log(`🚨 Sending alerts for ${sellRecommendations.length} SELL recommendations`);

      // Get user's FCM tokens for push notifications
      let userFcmTokens: string[] = [];
      try {
        await connectDB();
        const user = await User.findOne({ phoneNumber });
        if (user && user.fcmTokens && user.fcmTokens.length > 0) {
          userFcmTokens = user.fcmTokens;
          console.log(`📱 Found ${userFcmTokens.length} FCM tokens for user`);
        }
      } catch (error) {
        console.error(`⚠️ Failed to fetch user FCM tokens:`, error);
      }

      for (const stock of sellRecommendations) {
        try {
          // Ensure all values are defined
          if (!stock.currentPrice || !stock.volatilityStop || !stock.atr) {
            console.warn(`⚠️ Skipping ${stock.symbol}: missing data`);
            continue;
          }

          // Determine region for the stock
          const stockRegion =
            stocks.find((s: any) => s.symbol === stock.symbol)?.region || Region.US;

          // Send WhatsApp notification
          const simpleMessage = `🚨 SELL Alert\n\nSymbol: ${stock.symbol}\nCurrent Price: ${formatPrice(stock.currentPrice, stock.symbol, stockRegion)}\nVolatility Stop: ${formatPrice(stock.volatilityStop.stopLoss, stock.symbol, stockRegion)}\nDistance: ${stock.volatilityStop.stopLossPercentage.toFixed(1)}%\n\nRecommendation: SELL`;

          await sendWhatsApp({ to: phoneNumber, message: simpleMessage });
          alertsSent++;
          console.log(`✅ WhatsApp alert sent for ${stock.symbol}`);

          // Send Push Notification if user has FCM tokens
          if (userFcmTokens.length > 0) {
            try {
              const pushResult = await sendVolatilityAlertNotification(
                userFcmTokens,
                stock.symbol,
                stock.currentPrice,
                stock.volatilityStop.stopLoss,
                stock.volatilityStop.stopLossPercentage,
                stock.atr,
                stock.volatilityStop.recommendation,
                stockRegion
              );

              if (pushResult.successCount > 0) {
                pushNotificationsSent++;
                console.log(
                  `✅ Push notification sent for ${stock.symbol} to ${pushResult.successCount} devices`
                );
              }
            } catch (pushError) {
              console.error(`⚠️ Failed to send push notification for ${stock.symbol}:`, pushError);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to send alerts for ${stock.symbol}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      totalProcessed: stocks.length,
      totalSuccessful: results.filter((r) => r.success).length,
      totalFailed: errors.length,
      alertsSent,
      pushNotificationsSent,
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
