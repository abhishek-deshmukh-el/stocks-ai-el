/**
 * Application Constants
 */

export interface WatchlistStock {
  symbol: string;
  name: string;
  targetPrice?: number;
  atrPeriod?: number;
  atrMultiplier?: number;
  notifyEmail?: string;
  notifyPhone?: string;
  region?: 'US' | 'INDIA';
}

/**
 * US Stock Watchlist
 * US stocks to monitor for volatility stop triggers
 */
export const US_STOCKS: WatchlistStock[] = [
  {
    symbol: "AMD",
    name: "Advanced Micro Devices, Inc.",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: 'US',
  },
  // {
  //   symbol: "ASTS",
  //   name: "AST & Science, LLC",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
  // {
  //   symbol: "CCCX",
  //   name: "Churchill Capital Corp X-A",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.0,
  //   region: 'US',
  // },
  // {
  //   symbol: "CGNX",
  //   name: "Cognex Corporation",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.0,
  //   region: 'US',
  // },
  // {
  //   symbol: "CRDL",
  //   name: "Cardiol Therapeutics Inc",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
  // {
  //   symbol: "IMSR",
  //   name: "Terrestrial Energy Inc",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
  // {
  //   symbol: "LAC",
  //   name: "Lithium Americas Corp.",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.0,
  //   region: 'US',
  // },
  // {
  //   symbol: "MARA",
  //   name: "Marathon Digital Holdings Inc",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
  // {
  //   symbol: "META",
  //   name: "Meta Platforms Inc",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.0,
  //   region: 'US',
  // },
  // {
  //   symbol: "MP",
  //   name: "MP Materials Corp.",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.0,
  //   region: 'US',
  // },
  // {
  //   symbol: "NBIS",
  //   name: "Nebius Group N.V.",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
  // {
  //   symbol: "NVDA",
  //   name: "NVIDIA Corporation",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.0,
  //   region: 'US',
  // },
  // {
  //   symbol: "OPEN",
  //   name: "Opendoor Technologies Inc",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
  // {
  //   symbol: "PYPL",
  //   name: "PayPal Holdings, Inc.",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.0,
  //   region: 'US',
  // },
  {
    symbol: "RBRK",
    name: "Rubrik Inc.",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: 'US',
  },
  // {
  //   symbol: "SMCI",
  //   name: "Super Micro Computer, Inc.",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
  // {
  //   symbol: "TMQ",
  //   name: "Trilogy Metals Inc",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.0,
  //   region: 'US',
  // },
  // {
  //   symbol: "UMAC",
  //   name: "Unusual Machines Inc",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
  // {
  //   symbol: "WULF",
  //   name: "Terawulf Inc",
  //   atrPeriod: 14,
  //   atrMultiplier: 2.5,
  //   region: 'US',
  // },
];

/**
 * India Stock Watchlist
 * Indian stocks to monitor for volatility stop triggers
 */
export const INDIA_STOCKS: WatchlistStock[] = [
  // Add Indian stocks here if needed
];

/**
 * Combined Stock Watchlist
 * All stocks being monitored
 */
export const STOCK_WATCHLIST: WatchlistStock[] = [
  ...US_STOCKS,
  ...INDIA_STOCKS,
];

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
  HISTORICAL_DAYS: 30,
  
  // Volatility thresholds for alerts
  THRESHOLDS: {
    HIGH_VOLATILITY_PERCENT: 10, // Alert if stop is >10% away
    LOW_VOLATILITY_PERCENT: 3,   // Alert if stop is <3% away
    STOP_TRIGGERED_PERCENT: 0,   // Alert if price hits stop loss
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
  STOP_TRIGGERED = "STOP_TRIGGERED",         // Price hit stop loss
  HIGH_VOLATILITY = "HIGH_VOLATILITY",       // Volatility increased significantly
  LOW_VOLATILITY = "LOW_VOLATILITY",         // Volatility decreased significantly
  APPROACHING_STOP = "APPROACHING_STOP",     // Price near stop loss
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
export function formatPrice(price: number, symbol: string): string {
  // Check if it's an Indian stock (ends with .NS or .BSE)
  const isIndianStock = symbol.endsWith('.NS') || symbol.endsWith('.BSE') || symbol.endsWith('.BO');
  
  if (isIndianStock) {
    return `₹${price.toFixed(2)}`;
  }
  
  return `$${price.toFixed(2)}`;
}

/**
 * Get currency symbol based on stock region
 */
export function getCurrencySymbol(symbol: string): string {
  const isIndianStock = symbol.endsWith('.NS') || symbol.endsWith('.BSE') || symbol.endsWith('.BO');
  return isIndianStock ? '₹' : '$';
}
