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
  region?: "US" | "INDIA";
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
    region: "US",
  },
  {
    symbol: "ASTS",
    name: "AST & Science, LLC",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "CCCX",
    name: "Churchill Capital Corp X-A",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US",
  },
  {
    symbol: "CGNX",
    name: "Cognex Corporation",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US",
  },
  {
    symbol: "CRDL",
    name: "Cardiol Therapeutics Inc",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "IMSR",
    name: "Terrestrial Energy Inc",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "LAC",
    name: "Lithium Americas Corp.",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US",
  },
  {
    symbol: "MARA",
    name: "Marathon Digital Holdings Inc",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US",
  },
  {
    symbol: "MP",
    name: "MP Materials Corp.",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US",
  },
  {
    symbol: "NBIS",
    name: "Nebius Group N.V.",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US",
  },
  {
    symbol: "OPEN",
    name: "Opendoor Technologies Inc",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "PYPL",
    name: "PayPal Holdings, Inc.",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US",
  },
  {
    symbol: "RBRK",
    name: "Rubrik Inc.",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "SMCI",
    name: "Super Micro Computer, Inc.",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "TMQ",
    name: "Trilogy Metals Inc",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US",
  },
  {
    symbol: "UMAC",
    name: "Unusual Machines Inc",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
  {
    symbol: "WULF",
    name: "Terawulf Inc",
    atrPeriod: 14,
    atrMultiplier: 2.5,
    region: "US",
  },
];

/**
 * India Stock Watchlist
 * Indian stocks to monitor for volatility stop triggers
 */
export const INDIA_STOCKS: WatchlistStock[] = [
  {
    symbol: "LODHA.NS",
    name: "Lodha Developers",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "SILVERBEES.NS",
    name: "Nippon India ETF Silver BeES",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "VBL.NS",
    name: "Varun Beverages Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "CDSL.NS",
    name: "Central Depository Services (India) Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "SBICARD.NS",
    name: "SBI Cards and Payment Services Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "MAXHEALTH.NS",
    name: "Max Healthcare Institute Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "CAMS.NS",
    name: "Computer Age Management Services Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "SWIGGY.NS",
    name: "Swiggy Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "SWSOLAR.NS",
    name: "Sterling and Wilson Renewable Energy Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "KFINTECH.NS",
    name: "KFin Technologies Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "MON100.NS",
    name: "Motilal Oswal NASDAQ 100 ETF",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "MODEFENCE.NS",
    name: "Motilal Oswal Defence Index Fund ETF",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "GOLDBEES.NS",
    name: "Nippon India ETF Gold BeES",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "APOLLOHOSP.NS",
    name: "Apollo Hospitals Enterprise Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "CIPLA.NS",
    name: "Cipla Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "NIFTYBEES.NS",
    name: "Nippon India ETF Nifty BeES",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "COCHINSHIP.NS",
    name: "Cochin Shipyard Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "ICICIBANK.NS",
    name: "ICICI Bank Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "RAYMOND.NS",
    name: "Raymond Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "ORCHPHARMA.NS",
    name: "Orchid Pharma Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "REDINGTON.NS",
    name: "Redington Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "VERTOZ.NS",
    name: "Vertoz Advertising Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "BLUEJET.NS",
    name: "Blue Jet Healthcare Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "KALYANKJIL.NS",
    name: "Kalyan Jewellers India Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "PNGJL.NS",
    name: "PN Gadgil Jewellers Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "SULA.NS",
    name: "Sula Vineyards Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "CHOLAFIN.NS",
    name: "Cholamandalam Investment and Finance Company Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
  {
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank Limited",
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "INDIA",
  },
];

/**
 * Combined Stock Watchlist
 * All stocks being monitored
 */
export const STOCK_WATCHLIST: WatchlistStock[] = [...US_STOCKS, ...INDIA_STOCKS];

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
export function formatPrice(price: number, symbol: string): string {
  // Check if it's an Indian stock (ends with .NS or .BSE)
  const isIndianStock = symbol.endsWith(".NS") || symbol.endsWith(".BSE") || symbol.endsWith(".BO");

  if (isIndianStock) {
    return `₹${price.toFixed(2)}`;
  }

  return `$${price.toFixed(2)}`;
}

/**
 * Get currency symbol based on stock region
 */
export function getCurrencySymbol(symbol: string): string {
  const isIndianStock = symbol.endsWith(".NS") || symbol.endsWith(".BSE") || symbol.endsWith(".BO");
  return isIndianStock ? "₹" : "$";
}
