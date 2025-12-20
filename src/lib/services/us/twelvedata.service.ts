/**
 * Twelve Data Stock Service
 * Implementation of stock data fetching using Twelve Data API
 * Free tier: 800 API credits/day, 8 credits/minute
 */

import { StockData } from "../../volatility";
import { API_CONFIG } from "../../constants";

export class TwelveDataService {
  private apiKey: string;
  private requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 8;
  private readonly MINUTE_IN_MS = 60 * 1000;

  constructor() {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      throw new Error("TWELVE_DATA_API_KEY is not configured");
    }
    this.apiKey = apiKey;
  }

  /**
   * Wait if necessary to comply with rate limits (8 requests per minute)
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.MINUTE_IN_MS
    );

    // If we've made 8 requests in the last minute, wait
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = this.MINUTE_IN_MS - (now - oldestRequest) + 100; // Add 100ms buffer

      if (waitTime > 0) {
        console.log(
          `⏳ [Twelve Data] Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
  }

  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    try {
      // Wait for rate limit before making request
      await this.waitForRateLimit();

      console.log(`🔍 [Twelve Data] Fetching historical data for: ${symbol}`);
      const url = `${API_CONFIG.TWELVE_DATA.BASE_URL}/time_series?symbol=${symbol}&interval=1day&outputsize=${days}&apikey=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${symbol} (status):`, data.status || "ok");

      // Check for error
      if (data.status === "error") {
        console.warn(`⚠️ Twelve Data error for ${symbol}:`, data.message);
        throw new Error(`Twelve Data error: ${data.message}`);
      }

      if (data.values && Array.isArray(data.values)) {
        const stockData: StockData[] = data.values.map((item: any) => ({
          date: item.datetime,
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
        }));

        console.log(
          `✅ Successfully fetched ${stockData.length} days of historical data for ${symbol}`
        );
        return stockData.reverse(); // Twelve Data returns newest first, we want oldest first
      }

      throw new Error(`No time series data in response for ${symbol}`);
    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${symbol}:`, error);
      throw error;
    }
  }
}

/**
 * Singleton instance of TwelveDataService
 */
export const twelveDataService = new TwelveDataService();
