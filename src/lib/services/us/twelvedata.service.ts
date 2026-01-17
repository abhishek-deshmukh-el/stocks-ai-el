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
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 15000; // Start with 15 seconds

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

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error?.message || "";
    return (
      errorMessage.includes("run out of API credits") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("current limit being")
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    console.log(`⏳ [Twelve Data] Waiting ${Math.ceil(ms / 1000)}s before retry...`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute an API call with retry logic for rate limit errors
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // If it's a rate limit error and we have retries left
      if (this.isRateLimitError(error) && retryCount < this.MAX_RETRIES) {
        // Calculate wait time: exponential backoff with a minimum of waiting till next minute
        const exponentialDelay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        const waitTillNextMinute = this.MINUTE_IN_MS + 1000; // Wait a full minute plus buffer
        const waitTime = Math.max(exponentialDelay, waitTillNextMinute);

        console.warn(
          `⚠️ [Twelve Data] Rate limit hit for ${context}. Retry ${retryCount + 1}/${this.MAX_RETRIES} after ${Math.ceil(waitTime / 1000)}s...`
        );

        // Clear the request timestamps to reset rate limiting
        this.requestTimestamps = [];

        await this.sleep(waitTime);

        // Retry the operation
        return this.executeWithRetry(operation, context, retryCount + 1);
      }

      // If not a rate limit error or out of retries, throw the error
      throw error;
    }
  }

  async fetchHistoricalData(symbol: string, days: number): Promise<StockData[]> {
    return this.executeWithRetry(async () => {
      try {
        // Wait for rate limit before making request
        await this.waitForRateLimit();

        console.log(`🔍 [Twelve Data] Fetching historical data for: ${symbol}`);
        const url = `${API_CONFIG.TWELVE_DATA.BASE_URL}/time_series?symbol=${symbol}&interval=1day&outputsize=${days}&apikey=${this.apiKey}`;

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
    }, symbol);
  }
}

/**
 * Singleton instance of TwelveDataService
 */
export const twelveDataService = new TwelveDataService();
