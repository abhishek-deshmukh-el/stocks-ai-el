/**
 * Stock Price Alert Service
 * Checks stock prices and sends FCM notifications when target is reached
 */

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { sendStockAlertNotification, sendVolatilityAlertNotification } from "@/lib/fcm";
import { calculateVolatilityStop } from "@/lib/volatility";
import { getCurrencySymbol, Region } from "@/lib/constants";
import { stockOrchestrator } from "@/lib/services/stock-orchestrator.service";

export interface PriceCheckResult {
  symbol: string;
  currentPrice: number;
  alertPrice: number;
  notificationsSent: number;
  region: Region;
}

/**
 * Check if a stock has reached its alert price and send notifications
 */
export async function checkAndNotifyPriceAlert(
  symbol: string,
  currentPrice: number,
  alertPrice: number,
  region: Region,
  phoneNumber: string
): Promise<PriceCheckResult> {
  try {
    await connectDB();

    // Find the specific user by phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      console.log(`ℹ️ User ${phoneNumber} not found`);
      return {
        symbol,
        currentPrice,
        alertPrice,
        notificationsSent: 0,
        region,
      };
    }

    // Check if user has this stock with alert price
    const stocks = region === Region.US ? user.usStocks : user.indiaStocks;
    const stock = stocks.find(
      (s) => s.symbol === symbol && s.alertPrice && s.alertPrice >= currentPrice
    );

    console.log(
      `🔍 Checking ${symbol}: found stock =`,
      stock ? "YES" : "NO",
      `| alertPrice: ${stock?.alertPrice}, currentPrice: ${currentPrice}`
    );

    if (!stock) {
      console.log(`ℹ️ User not watching ${symbol} at alert price ${alertPrice}`);
      return {
        symbol,
        currentPrice,
        alertPrice,
        notificationsSent: 0,
        region,
      };
    }

    // Collect FCM tokens
    const allTokens = user.fcmTokens;

    console.log(
      `🔔 FCM tokens for ${phoneNumber}:`,
      allTokens.length > 0 ? `${allTokens.length} tokens` : "NO TOKENS"
    );

    if (allTokens.length === 0) {
      console.log(`ℹ️ No FCM tokens for users watching ${symbol}`);
      return {
        symbol,
        currentPrice,
        alertPrice,
        notificationsSent: 0,
        region,
      };
    }

    // Send notifications
    const result = await sendStockAlertNotification(
      allTokens,
      symbol,
      currentPrice,
      alertPrice,
      region
    );

    console.log(
      `✅ Sent ${result.successCount} price alert notifications for ${symbol} at ${getCurrencySymbol(region === Region.US ? "AAPL" : "RELIANCE")}${currentPrice}`
    );

    return {
      symbol,
      currentPrice,
      alertPrice,
      notificationsSent: result.successCount,
      region,
    };
  } catch (error) {
    console.error(`❌ Error checking price alert for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Check volatility and send notifications
 */
export async function checkAndNotifyVolatility(
  symbol: string,
  region: Region,
  historicalPrices: number[]
): Promise<void> {
  try {
    await connectDB();

    // Find users watching this stock
    const users = await User.find({
      $or: [
        {
          usStocks: {
            $elemMatch: {
              symbol: symbol,
              region: region,
            },
          },
        },
        {
          indiaStocks: {
            $elemMatch: {
              symbol: symbol,
              region: region,
            },
          },
        },
      ],
    });

    if (users.length === 0) {
      return;
    }

    // Calculate volatility for each user's settings
    for (const user of users) {
      const stocks = region === Region.US ? user.usStocks : user.indiaStocks;
      const stock = stocks.find((s) => s.symbol === symbol);

      if (!stock) continue;

      const { atrPeriod = 14, atrMultiplier = 2.0 } = stock;
      const currentPrice = historicalPrices[historicalPrices.length - 1];

      // Calculate ATR from historical prices
      // For simplicity, using a basic ATR calculation
      // In production, you'd want to pass proper OHLC data
      const trueRanges: number[] = [];
      for (let i = 1; i < Math.min(atrPeriod + 1, historicalPrices.length); i++) {
        trueRanges.push(Math.abs(historicalPrices[i] - historicalPrices[i - 1]));
      }
      const atr =
        trueRanges.length > 0 ? trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length : 0;

      const volatilityData = calculateVolatilityStop(currentPrice, atr, atrMultiplier);

      // Send notification if user has FCM tokens
      if (user.fcmTokens.length > 0) {
        await sendVolatilityAlertNotification(
          user.fcmTokens,
          symbol,
          currentPrice,
          volatilityData.stopLoss,
          volatilityData.stopLossPercentage,
          volatilityData.atr,
          volatilityData.recommendation,
          region
        );
      }
    }
  } catch (error) {
    console.error(`❌ Error checking volatility for ${symbol}:`, error);
  }
}

/**
 * Batch check all stocks in a user's watchlist
 */
export async function batchCheckAllStocks(userPhoneNumber: string): Promise<{
  success: boolean;
  checkedCount: number;
  notificationsSent: number;
}> {
  try {
    await connectDB();

    // Get stocks for the specific user
    const user = await User.findOne({ phoneNumber: userPhoneNumber });

    if (!user) {
      console.log(`⚠️ User ${userPhoneNumber} not found`);
      return {
        success: false,
        checkedCount: 0,
        notificationsSent: 0,
      };
    }

    const users = [user];

    const usStocksSet = new Set<string>();
    const indiaStocksSet = new Set<string>();

    users.forEach((user) => {
      user.usStocks.forEach((stock) => usStocksSet.add(stock.symbol));
      user.indiaStocks.forEach((stock) => indiaStocksSet.add(stock.symbol));
    });

    console.log(
      `📊 Checking ${usStocksSet.size} US stocks and ${indiaStocksSet.size} India stocks for user ${userPhoneNumber}`
    );

    let totalNotifications = 0;

    // Check US stocks
    for (const symbol of usStocksSet) {
      try {
        // Find the stock with alert price
        const stockInfo = user.usStocks.find((s) => s.symbol === symbol);
        if (!stockInfo || !stockInfo.alertPrice) {
          console.log(`⏭️ Skipping ${symbol} - no alert price set`);
          continue;
        }

        // Fetch current price directly from orchestrator
        const currentPrice = await stockOrchestrator.fetchCurrentPrice(symbol, Region.US);

        console.log(`📈 ${symbol}: Current $${currentPrice}, Alert $${stockInfo.alertPrice}`);

        // Check if notification should be sent (price <= alert)
        if (currentPrice <= stockInfo.alertPrice) {
          const result = await checkAndNotifyPriceAlert(
            symbol,
            currentPrice,
            stockInfo.alertPrice,
            Region.US,
            userPhoneNumber
          );
          totalNotifications += result.notificationsSent;
        }
      } catch (error) {
        console.error(`❌ Error checking ${symbol}:`, error);
      }
    }

    // Check India stocks
    for (const symbol of indiaStocksSet) {
      try {
        const stockInfo = user.indiaStocks.find((s) => s.symbol === symbol);
        if (!stockInfo || !stockInfo.alertPrice) {
          console.log(`⏭️ Skipping ${symbol} - no alert price set`);
          continue;
        }

        // Fetch current price directly from orchestrator
        const currentPrice = await stockOrchestrator.fetchCurrentPrice(symbol, Region.INDIA);

        console.log(`📈 ${symbol}: Current ₹${currentPrice}, Alert ₹${stockInfo.alertPrice}`);

        // Check if notification should be sent (price <= alert)
        if (currentPrice <= stockInfo.alertPrice) {
          const result = await checkAndNotifyPriceAlert(
            symbol,
            currentPrice,
            stockInfo.alertPrice,
            Region.INDIA,
            userPhoneNumber
          );
          totalNotifications += result.notificationsSent;
        }
      } catch (error) {
        console.error(`❌ Error checking ${symbol}:`, error);
      }
    }

    return {
      success: true,
      checkedCount: usStocksSet.size + indiaStocksSet.size,
      notificationsSent: totalNotifications,
    };
  } catch (error) {
    console.error("❌ Error in batch check:", error);
    return {
      success: false,
      checkedCount: 0,
      notificationsSent: 0,
    };
  }
}
