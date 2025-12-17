/**
 * Batch Job Runner
 * Processes stock watchlist and sends volatility alerts
 */

import {
  STOCK_WATCHLIST,
  BATCH_CONFIG,
  AlertCondition,
  type WatchlistStock,
  type BatchJobStatus,
} from "./constants";
import { fetchCurrentPrice, fetchHistoricalData } from "./stock-api";
import { calculateATR, calculateVolatilityStop, type VolatilityStop } from "./volatility";
import { sendStockAlertWhatsApp } from "./whatsapp";
import { isMarketOpen, getMarketStatus } from "./market-hours";

interface StockAlert {
  stock: WatchlistStock;
  currentPrice: number;
  volatilityStop: VolatilityStop;
  condition: AlertCondition;
  message: string;
}

/**
 * Check if volatility stop should trigger alert
 */
function shouldAlert(
  currentPrice: number,
  stopLoss: number,
  stopLossPercentage: number,
  targetPrice?: number
): { shouldAlert: boolean; condition: AlertCondition } {
  // Check if price hit stop loss
  if (currentPrice <= stopLoss) {
    return {
      shouldAlert: true,
      condition: AlertCondition.STOP_TRIGGERED,
    };
  }

  // Check if approaching stop loss (within 5% of stop)
  const distanceToStop = ((currentPrice - stopLoss) / currentPrice) * 100;
  if (distanceToStop < 5) {
    return {
      shouldAlert: true,
      condition: AlertCondition.APPROACHING_STOP,
    };
  }

  // Check for high volatility
  if (stopLossPercentage > BATCH_CONFIG.THRESHOLDS.HIGH_VOLATILITY_PERCENT) {
    return {
      shouldAlert: true,
      condition: AlertCondition.HIGH_VOLATILITY,
    };
  }

  return { shouldAlert: false, condition: AlertCondition.LOW_VOLATILITY };
}

/**
 * Process a single stock and generate alerts if needed
 */
async function processStock(stock: WatchlistStock): Promise<StockAlert | null> {
  try {
    console.log(`🔍 Processing ${stock.symbol}...`);

    // Fetch current price
    const currentPrice = await fetchCurrentPrice(stock.symbol);

    // Fetch historical data
    const historicalData = await fetchHistoricalData(
      stock.symbol,
      BATCH_CONFIG.HISTORICAL_DAYS
    );

    // Calculate volatility stop
    const atr = calculateATR(
      historicalData,
      stock.atrPeriod || BATCH_CONFIG.DEFAULT_ATR_PERIOD
    );

    const volatilityStop = calculateVolatilityStop(
      currentPrice,
      atr,
      stock.atrMultiplier || BATCH_CONFIG.DEFAULT_ATR_MULTIPLIER
    );

    // Check if should alert
    const { shouldAlert: alert, condition } = shouldAlert(
      currentPrice,
      volatilityStop.stopLoss,
      volatilityStop.stopLossPercentage,
      stock.targetPrice
    );

    if (alert) {
      const message = generateAlertMessage(stock, currentPrice, volatilityStop, condition);

      return {
        stock,
        currentPrice,
        volatilityStop,
        condition,
        message,
      };
    }

    console.log(`✅ ${stock.symbol}: No alert needed (Price: $${currentPrice.toFixed(2)}, Stop: $${volatilityStop.stopLoss})`);
    return null;
  } catch (error) {
    console.error(`❌ Error processing ${stock.symbol}:`, error);
    return null;
  }
}

/**
 * Generate alert message based on condition
 */
function generateAlertMessage(
  stock: WatchlistStock,
  currentPrice: number,
  volatilityStop: VolatilityStop,
  condition: AlertCondition
): string {
  switch (condition) {
    case AlertCondition.STOP_TRIGGERED:
      return `🚨 STOP LOSS TRIGGERED for ${stock.symbol}! Price ($${currentPrice.toFixed(2)}) hit stop at $${volatilityStop.stopLoss}`;
    
    case AlertCondition.APPROACHING_STOP:
      return `⚠️ ${stock.symbol} approaching stop loss! Price: $${currentPrice.toFixed(2)}, Stop: $${volatilityStop.stopLoss}`;
    
    case AlertCondition.HIGH_VOLATILITY:
      return `📊 High volatility detected for ${stock.symbol}! Stop is ${volatilityStop.stopLossPercentage}% away at $${volatilityStop.stopLoss}`;
    
    default:
      return `📈 Alert for ${stock.symbol}: Current $${currentPrice.toFixed(2)}, Stop $${volatilityStop.stopLoss}`;
  }
}

/**
 * Send alerts for a stock
 */
async function sendAlerts(alert: StockAlert): Promise<boolean> {
  const { stock, currentPrice, volatilityStop } = alert;
  
  // Use admin WhatsApp if stock-specific contact not provided
  const phone = stock.notifyPhone || process.env.ADMIN_PHONE;

  if (!phone) {
    console.log(`⚠️ No WhatsApp number configured for ${stock.symbol}`);
    return false;
  }

  // Send WhatsApp notification
  const success = await sendStockAlertWhatsApp(
    phone,
    stock.symbol,
    currentPrice,
    volatilityStop.stopLoss,
    volatilityStop.stopLossPercentage,
    volatilityStop.atr,
    volatilityStop.recommendation
  );

  if (success) {
    console.log(`✅ WhatsApp alert sent for ${stock.symbol}`);
  } else {
    console.log(`❌ WhatsApp alert failed for ${stock.symbol}`);
  }

  return success;
}

/**
 * Run the batch job
 */
export async function runBatchJob(): Promise<BatchJobStatus> {
  const status: BatchJobStatus = {
    lastRun: new Date(),
    nextRun: new Date(Date.now() + BATCH_CONFIG.INTERVAL_MS),
    isRunning: true,
    stocksProcessed: 0,
    alertsSent: 0,
    errors: [],
  };

  console.log("\n🚀 Starting batch job...");
  
  // Check if market is open
  if (!isMarketOpen()) {
    const marketStatus = getMarketStatus();
    console.log(`⏸️  Batch job skipped: ${marketStatus.message}`);
    console.log(`📅 Next market open: ${marketStatus.nextOpen.toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
    
    status.isRunning = false;
    status.errors.push('Market is currently closed');
    return status;
  }

  console.log(`📊 Processing ${STOCK_WATCHLIST.length} stocks`);

  try {
    const alerts: StockAlert[] = [];

    // Process each stock
    for (const stock of STOCK_WATCHLIST.slice(0, BATCH_CONFIG.MAX_STOCKS_PER_BATCH)) {
      try {
        const alert = await processStock(stock);
        if (alert) {
          alerts.push(alert);
        }
        status.stocksProcessed++;

        // Rate limiting delay
        await new Promise((resolve) => setTimeout(resolve, BATCH_CONFIG.API_DELAY_MS));
      } catch (error) {
        const errorMsg = `Error processing ${stock.symbol}: ${error}`;
        status.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Send alerts
    console.log(`\n📬 Sending ${alerts.length} alerts...`);
    for (const alert of alerts) {
      try {
        console.log(alert.message);
        const success = await sendAlerts(alert);
        if (success) {
          status.alertsSent++;
        } else {
          const errorMsg = `Failed to send WhatsApp alert for ${alert.stock.symbol}`;
          status.errors.push(errorMsg);
        }
      } catch (error) {
        const errorMsg = `Error sending alert for ${alert.stock.symbol}: ${error}`;
        status.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Send summary to admin WhatsApp
    if (process.env.ADMIN_PHONE) {
      await sendBatchSummary(status, alerts);
    }

    console.log("\n✅ Batch job completed!");
    console.log(`   Stocks processed: ${status.stocksProcessed}`);
    console.log(`   Alerts sent: ${status.alertsSent}`);
    console.log(`   Errors: ${status.errors.length}`);
  } catch (error) {
    console.error("❌ Batch job failed:", error);
    status.errors.push(`Batch job failed: ${error}`);
  } finally {
    status.isRunning = false;
  }

  return status;
}

/**
 * Send batch job summary via WhatsApp
 */
async function sendBatchSummary(
  status: BatchJobStatus,
  alerts: StockAlert[]
): Promise<void> {
  const phone = process.env.ADMIN_PHONE;
  if (!phone) return;

  const alertsList = alerts.map((alert) => 
    `• ${alert.stock.symbol}: $${alert.currentPrice.toFixed(2)} → Stop: $${alert.volatilityStop.stopLoss}`
  ).join('\n');

  const message = `
📊 *Batch Job Summary*
${status.lastRun?.toLocaleString()}

✅ Stocks Processed: ${status.stocksProcessed}
🔔 Alerts Sent: ${status.alertsSent}
❌ Errors: ${status.errors.length}

${
    alerts.length > 0
      ? `🚨 *Alerts Generated:*\n${alertsList}`
      : '✅ No alerts generated this run.'
  }

⏰ Next run: ${status.nextRun?.toLocaleString()}
  `.trim();

  await sendStockAlertWhatsApp(
    phone,
    "BATCH_SUMMARY",
    0,
    0,
    0,
    0,
    "HOLD"
  ).catch(() => {
    // Use custom message for summary
    console.log("💬 Batch Summary (Development Mode):");
    console.log(`   To: ${phone}`);
    console.log(`   Stocks: ${status.stocksProcessed}, Alerts: ${status.alertsSent}, Errors: ${status.errors.length}`);
  });
}

/**
 * Start the batch job scheduler
 */
export function startBatchScheduler(): NodeJS.Timeout | null {
  if (process.env.BATCH_ENABLED !== "true") {
    console.log("⏸️  Batch scheduler disabled");
    return null;
  }

  console.log(`⏰ Batch scheduler started (runs every ${BATCH_CONFIG.INTERVAL_MS / 1000 / 60} minutes)`);

  // Run immediately on start
  runBatchJob();

  // Schedule recurring runs
  return setInterval(() => {
    runBatchJob();
  }, BATCH_CONFIG.INTERVAL_MS);
}
