/**
 * Application Constants
 */

export enum Region {
  US = "US",
  INDIA = "INDIA",
}

export interface WatchlistStock {
  symbol: string;
  name: string;
  alertPrice?: number;
  atrPeriod?: number;
  atrMultiplier?: number;
  notifyEmail?: string;
  notifyPhone?: string;
  region?: Region;
  owned?: boolean;
}

/**
 * Note: Stock watchlists are now stored in the database per user.
 * Use the User model's usStocks and indiaStocks arrays as the source of truth.
 */

/**
 * Batch Job Configuration
 */
export const BATCH_CONFIG = {
  // How often to run the batch job (in milliseconds)
  INTERVAL_MS: 60 * 60 * 1000, // 1 hour

  // ATR calculation defaults
  DEFAULT_ATR_PERIOD: 14,
  DEFAULT_ATR_MULTIPLIER: 2.0,

  // Number of days of historical data to fetch
  HISTORICAL_DAYS: 90,

  // Volatility thresholds for alerts
  THRESHOLDS: {
    HIGH_VOLATILITY_PERCENT: 10, // Alert if stop is >10% away
    LOW_VOLATILITY_PERCENT: 3, // Alert if stop is <3% away
    STOP_TRIGGERED_PERCENT: 0, // Alert if price hits stop loss
  },

  // Rate limiting for API calls
  API_DELAY_MS: 100, // Wait 1 second between API calls

  // Maximum stocks to process per batch
  MAX_STOCKS_PER_BATCH: 50,
};

/**
 * Stock Data API Configuration
 */
export const API_CONFIG = {
  // Alpha Vantage (Free tier: 25 requests/day, 5 requests/minute)
  ALPHA_VANTAGE: {
    BASE_URL: "https://www.alphavantage.co/query",
    DAILY_LIMIT: 25,
    MINUTE_LIMIT: 5,
  },

  // Finnhub (Free tier: 60 calls/minute)
  FINNHUB: {
    BASE_URL: "https://finnhub.io/api/v1",
    MINUTE_LIMIT: 60,
  },

  // Twelve Data (Free tier: 800 credits/day, 8 credits/minute)
  TWELVE_DATA: {
    BASE_URL: "https://api.twelvedata.com",
    DAILY_LIMIT: 800,
    MINUTE_LIMIT: 8,
  },

  // NSE India (Free API for Indian stocks)
  NSE: {
    BASE_URL: "https://nse-api-sand.vercel.app",
  },
};

/**
 * Notification Configuration
 */
export const NOTIFICATION_CONFIG = {
  // WhatsApp settings
  WHATSAPP: {
    MAX_LENGTH: 4096, // WhatsApp message length limit
  },

  // Batch notification settings
  BATCH: {
    SUMMARY_WHATSAPP: true, // Send summary via WhatsApp after each batch
    INDIVIDUAL_ALERTS: true, // Send individual alerts per stock
  },
};

/**
 * Alert Conditions
 */
export enum AlertCondition {
  STOP_TRIGGERED = "STOP_TRIGGERED", // Price hit stop loss
  HIGH_VOLATILITY = "HIGH_VOLATILITY", // Volatility increased significantly
  LOW_VOLATILITY = "LOW_VOLATILITY", // Volatility decreased significantly
  APPROACHING_STOP = "APPROACHING_STOP", // Price near stop loss
}

/**
 * Batch Job Status
 */
export interface BatchJobStatus {
  lastRun: Date | null;
  nextRun: Date | null;
  isRunning: boolean;
  stocksProcessed: number;
  alertsSent: number;
  errors: string[];
}

/**
 * Format price with appropriate currency symbol based on stock region
 */
export function formatPrice(price: number, symbol: string, region?: Region): string {
  // If region is explicitly provided, use it
  if (region !== undefined) {
    return region === Region.INDIA ? `₹${price.toFixed(2)}` : `$${price.toFixed(2)}`;
  }

  // Otherwise, check if it's an Indian stock (ends with .NS or .BSE)
  const isIndianStock = symbol.endsWith(".NS") || symbol.endsWith(".BSE") || symbol.endsWith(".BO");

  if (isIndianStock) {
    return `₹${price.toFixed(2)}`;
  }

  return `$${price.toFixed(2)}`;
}

/**
 * Get currency symbol based on stock region
 */
export function getCurrencySymbol(symbol: string, region?: Region): string {
  // If region is explicitly provided, use it
  if (region !== undefined) {
    return region === Region.INDIA ? "₹" : "$";
  }

  const isIndianStock = symbol.endsWith(".NS") || symbol.endsWith(".BSE") || symbol.endsWith(".BO");
  return isIndianStock ? "₹" : "$";
}
