/**
 * Finnhub Stock Service
 * Implementation of stock data fetching using Finnhub API
 */

import { StockData } from "../../volatility";
import { API_CONFIG } from "../../constants";

/**
 * Market Status Interface
 */
interface MarketStatus {
  exchange: string;
  isOpen: boolean;
}

export class FinnhubService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey || apiKey === "your_api_key") {
      console.error("❌ FINNHUB_API_KEY environment variable is missing or not set properly");
      throw new Error("FINNHUB_API_KEY is not configured. Please set it in your .env.local file.");
    }
    this.apiKey = apiKey;
    console.log("✅ FinnhubService initialized successfully");
  }

  async fetchCurrentPrice(symbol: string): Promise<number> {
    try {
      console.log(`🔍 [Finnhub] Fetching price for: ${symbol}`);
      const url = `${API_CONFIG.FINNHUB.BASE_URL}/quote?symbol=${symbol}&token=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();

      // Check for error
      if (data.error) {
        console.warn(`⚠️ Finnhub error for ${symbol}:`, data.error);
        throw new Error(`Finnhub error: ${data.error}`);
      }

      // Finnhub returns current price in 'c' field
      if (data.c !== undefined && data.c !== 0) {
        const price = data.c;
        console.log(`✅ Successfully fetched ${symbol}, price: ${price}`);
        return price;
      }

      throw new Error(`No valid price data in response for ${symbol}`);
    } catch (error) {
      console.error(`❌ Failed to fetch ${symbol}:`, error);
      throw error;
    }
  }

  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    try {
      console.log(`🔍 [Finnhub] Fetching historical data for: ${symbol}`);

      // Calculate date range (Finnhub requires unix timestamps)
      const to = Math.floor(Date.now() / 1000);
      const from = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

      const url = `${API_CONFIG.FINNHUB.BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();

      // Check for error or no data
      if (data.s === "no_data") {
        throw new Error(`No historical data available for ${symbol}`);
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

      throw new Error(`Invalid data format in response for ${symbol}`);
    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${symbol}:`, error);
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
 * Get market status details for a specific exchange
 */
export async function getMarketStatusDetails(
  exchange: string = "US"
): Promise<MarketStatus | null> {
  return await finnhubService.fetchMarketStatus(exchange);
}

/**
 * Get Indian market status based on time
 * NSE market hours: 9:15 AM - 3:30 PM IST (Monday-Friday)
 */
export function getIndianMarketStatusByTime(): {
  isOpen: boolean;
} {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  const hour = istTime.getHours();
  const minute = istTime.getMinutes();
  const day = istTime.getDay();

  // Weekend check (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) {
    return {
      isOpen: false,
    };
  }

  // Market hours: 9:15 AM to 3:30 PM IST
  const isMarketHours =
    (hour === 9 && minute >= 15) || (hour > 9 && hour < 15) || (hour === 15 && minute <= 30);

  return {
    isOpen: isMarketHours,
  };
}

/**
 * Get combined market status summary (US and India)
 */
export async function getMarketStatus(): Promise<{
  us: {
    isOpen: boolean;
  };
  india: {
    isOpen: boolean;
  };
}> {
  // Get India status using time-based logic (no API call needed)
  const indiaStatus = getIndianMarketStatusByTime();

  // Try to get US status from Finnhub API, fallback to false on error
  let usIsOpen = false;
  try {
    const usStatus = await finnhubService.fetchMarketStatus("US");
    usIsOpen = usStatus?.isOpen || false;
  } catch (error) {
    console.error("Error fetching US market status:", error);
  }

  return {
    us: {
      isOpen: usIsOpen,
    },
    india: indiaStatus,
  };
}

/**
 * Singleton instance of FinnhubService
 */
export const finnhubService = new FinnhubService();
