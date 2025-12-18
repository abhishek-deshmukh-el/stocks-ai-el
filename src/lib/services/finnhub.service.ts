/**
 * Finnhub Stock Service
 * Implementation of stock data fetching using Finnhub API
 */

import { IStockService } from "./stock-service.interface";
import { StockData } from "../volatility";
import { API_CONFIG } from "../constants";

/**
 * Market Status Interface
 */
interface MarketStatus {
  exchange: string;
  holiday: string | null;
  isOpen: boolean;
  session: string | null;
  timezone: string;
  t: number;
}

export class FinnhubService implements IStockService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey || apiKey === "your_api_key") {
      console.error("❌ FINNHUB_API_KEY environment variable is missing or not set properly");
      console.error(
        "📝 Please check your .env.local file and ensure FINNHUB_API_KEY is set to your actual API key"
      );
      console.error("🔑 Get your API key from: https://finnhub.io/register");
      throw new Error("FINNHUB_API_KEY is not configured. Please set it in your .env.local file.");
    }
    this.apiKey = apiKey;
    console.log("✅ FinnhubService initialized successfully");
  }

  getName(): string {
    return "Finnhub";
  }

  /**
   * Convert Indian stock symbols to Finnhub format
   * Finnhub uses IC (India) exchange code for NSE stocks
   * Format: SYMBOL or just use the base ticker
   */
  private getSymbolVariant(symbol: string): string {
    if (symbol.endsWith(".NS")) {
      // For Indian NSE stocks, Finnhub may use just the base symbol
      // or IC:SYMBOL format (IC = India)
      const baseName = symbol.replace(".NS", "");
      // Try IC exchange format first
      const icSymbol = `${baseName}.NSE`;
      console.log(`🔄 Indian stock detected: ${symbol} - Using Finnhub format: ${icSymbol}`);
      return icSymbol;
    }
    if (symbol.endsWith(".BO")) {
      // Bombay Stock Exchange
      const baseName = symbol.replace(".BO", "");
      const bseSymbol = `${baseName}.BSE`;
      console.log(`🔄 Indian stock detected: ${symbol} - Using BSE format: ${bseSymbol}`);
      return bseSymbol;
    }
    console.log(`📊 Using symbol as-is: ${symbol}`);
    return symbol;
  }

  async fetchCurrentPrice(symbol: string): Promise<number> {
    const variant = this.getSymbolVariant(symbol);

    try {
      console.log(`🔍 [Finnhub] Fetching price for: ${variant}`);
      const url = `${API_CONFIG.FINNHUB.BASE_URL}/quote?symbol=${variant}&token=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${variant}:`, JSON.stringify(data, null, 2));

      // Check for error
      if (data.error) {
        console.warn(`⚠️ Finnhub error for ${variant}:`, data.error);
        throw new Error(`Finnhub error: ${data.error}`);
      }

      // Finnhub returns current price in 'c' field
      if (data.c !== undefined && data.c !== 0) {
        const price = data.c;
        console.log(`✅ Successfully fetched ${symbol} using variant: ${variant}, price: ${price}`);
        return price;
      }

      // If no data, try alternate formats for Indian stocks
      if (symbol.endsWith(".NS")) {
        console.warn(`⚠️ No data for ${variant}, trying alternate formats...`);
        return await this.tryAlternateFormats(symbol);
      }

      throw new Error(`No valid price data in response for ${variant}`);
    } catch (error) {
      console.error(`❌ Failed to fetch ${variant}:`, error);
      throw error;
    }
  }

  /**
   * Try alternate symbol formats for Indian stocks
   */
  private async tryAlternateFormats(symbol: string): Promise<number> {
    const baseName = symbol.replace(".NS", "");
    const formats = [
      baseName, // Just the ticker
      `NSE:${baseName}`, // NSE: prefix
      `${baseName}.NS`, // Yahoo Finance format
      `IC:${baseName}`, // IC exchange code
    ];

    for (const format of formats) {
      try {
        console.log(`🔄 Trying format: ${format}`);
        const url = `${API_CONFIG.FINNHUB.BASE_URL}/quote?symbol=${format}&token=${this.apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.c !== undefined && data.c !== 0) {
          console.log(`✅ Success with format: ${format}, price: ${data.c}`);
          return data.c;
        }
      } catch (error) {
        console.log(`❌ Failed with format: ${format}`);
      }
    }

    throw new Error(`Unable to find valid data for ${symbol} in any format`);
  }

  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    const variant = this.getSymbolVariant(symbol);

    try {
      console.log(`🔍 [Finnhub] Fetching historical data for: ${variant}`);

      // Calculate date range (Finnhub requires unix timestamps)
      const to = Math.floor(Date.now() / 1000);
      const from = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

      const url = `${API_CONFIG.FINNHUB.BASE_URL}/stock/candle?symbol=${variant}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${variant} (status):`, data.s);

      // Check for error or no data
      if (data.s === "no_data") {
        throw new Error(`No historical data available for ${variant}`);
      }

      if (data.s !== "ok") {
        throw new Error(`Finnhub error: ${data.s}`);
      }

      if (data.c && data.h && data.l && data.t) {
        const stockData: StockData[] = [];

        for (let i = 0; i < data.c.length; i++) {
          const date = new Date(data.t[i] * 1000).toISOString().split("T")[0];
          stockData.push({
            date,
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
          });
        }

        console.log(
          `✅ Successfully fetched ${stockData.length} days of historical data for ${symbol}`
        );
        return stockData;
      }

      throw new Error(`Invalid data format in response for ${variant}`);
    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${variant}:`, error);
      throw error;
    }
  }

  /**
   * Fetch analyst recommendations for a stock
   * Returns monthly recommendation trends (buy/hold/sell)
   */
  async fetchRecommendations(symbol: string): Promise<any[]> {
    try {
      console.log(`🔍 [Finnhub] Fetching recommendations for: ${symbol}`);

      const url = `${API_CONFIG.FINNHUB.BASE_URL}/stock/recommendation?symbol=${symbol}&token=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📥 Recommendations for ${symbol}:`, JSON.stringify(data, null, 2));

      if (Array.isArray(data) && data.length > 0) {
        console.log(
          `✅ Successfully fetched ${data.length} months of recommendations for ${symbol}`
        );
        return data;
      }

      return [];
    } catch (error) {
      console.error(`❌ Failed to fetch recommendations for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch market status from Finnhub API
   */
  async fetchMarketStatus(exchange: string = "US"): Promise<MarketStatus | null> {
    try {
      const url = `${API_CONFIG.FINNHUB.BASE_URL}/stock/market-status?exchange=${exchange}&token=${this.apiKey}`;

      console.log("🚀 ~ FinnhubService ~ fetchMarketStatus ~ url:", url);

      const response = await fetch(url, { next: { revalidate: 120 } }); // Cache for 2 minutes

      if (!response.ok) {
        console.error(`Failed to fetch market status: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching market status:", error);
      return null;
    }
  }
}

/**
 * Market Hours Utility Functions
 */

/**
 * Singleton instance of FinnhubService
 */
export const finnhubService = new FinnhubService();

/**
 * Check if US stock market is currently open using Finnhub API
 */
export async function isMarketOpen(): Promise<boolean> {
  const status = await finnhubService.fetchMarketStatus("US");

  if (!status) {
    return false;
  }

  if (status.isOpen) {
    console.log(`🟢 US Market open - Session: ${status.session || "regular"}`);
  } else {
    console.log(`🔴 US Market closed${status.holiday ? ` - Holiday: ${status.holiday}` : ""}`);
  }

  return status.isOpen;
}

/**
 * Check if Indian stock market (NSE) is currently open using Finnhub API
 */
export async function isIndianMarketOpen(): Promise<boolean> {
  const status = await finnhubService.fetchMarketStatus("IN");

  if (!status) {
    return false;
  }

  if (status.isOpen) {
    console.log(`🟢 Indian Market open - Session: ${status.session || "regular"}`);
  } else {
    console.log(`🔴 Indian Market closed${status.holiday ? ` - Holiday: ${status.holiday}` : ""}`);
  }

  return status.isOpen;
}

/**
 * Get market status details for a specific exchange
 */
export async function getMarketStatusDetails(
  exchange: string = "US"
): Promise<MarketStatus | null> {
  return await finnhubService.fetchMarketStatus(exchange);
}

/**
 * Get next US market open time (estimate based on current time)
 */
export function getNextMarketOpen(): Date {
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

  const nextOpen = new Date(estTime);

  // Set to next 9:30 AM
  nextOpen.setHours(9, 30, 0, 0);

  // If it's past market hours today, move to tomorrow
  if (estTime.getHours() >= 16) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  // Skip weekends
  while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  return nextOpen;
}

/**
 * Get next Indian market open time (estimate based on current time)
 */
export function getNextIndianMarketOpen(): Date {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  const nextOpen = new Date(istTime);

  // Set to next 9:15 AM IST
  nextOpen.setHours(9, 15, 0, 0);

  // If it's past market hours today, move to tomorrow
  if (istTime.getHours() >= 15 && istTime.getMinutes() >= 30) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  // Skip weekends
  while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  return nextOpen;
}

/**
 * Get combined market status summary (US and India)
 */
export async function getMarketStatus(): Promise<{
  us: {
    isOpen: boolean;
    session?: string | null;
    holiday?: string | null;
  };
  india: {
    isOpen: boolean;
    session?: string | null;
    holiday?: string | null;
  };
}> {
  const [usStatus, indiaStatus] = await Promise.all([
    finnhubService.fetchMarketStatus("US"),
    finnhubService.fetchMarketStatus("IN"),
  ]);

  return {
    us: {
      isOpen: usStatus?.isOpen || false,
      session: usStatus?.session,
      holiday: usStatus?.holiday,
    },
    india: {
      isOpen: indiaStatus?.isOpen || false,
      session: indiaStatus?.session,
      holiday: indiaStatus?.holiday,
    },
  };
}
