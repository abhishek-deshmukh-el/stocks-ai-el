/**
 * Twelve Data Stock Service
 * Implementation of stock data fetching using Twelve Data API
 * Free tier: 800 API credits/day, 8 credits/minute
 */

import { StockData } from "../../volatility";
import { API_CONFIG } from "../../constants";

export class TwelveDataService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      throw new Error("TWELVE_DATA_API_KEY is not configured");
    }
    this.apiKey = apiKey;
  }

  // async fetchCurrentPrice(symbol: string): Promise<number> {
  //   try {
  //     console.log(`🔍 [Twelve Data] Fetching price for: ${symbol}`);
  //     const url = `${API_CONFIG.TWELVE_DATA.BASE_URL}/price?symbol=${symbol}&apikey=${this.apiKey}`;
  //     console.log(`📡 Fetching URL: ${url}`);

  //     const response = await fetch(url);
  //     const data = await response.json();
  //     console.log(`📥 Response for ${symbol}:`, JSON.stringify(data, null, 2));

  //     // Check for error
  //     if (data.status === "error") {
  //       console.warn(`⚠️ Twelve Data error for ${symbol}:`, data.message);
  //       throw new Error(`Twelve Data error: ${data.message}`);
  //     }

  //     // Twelve Data returns price in 'price' field
  //     if (data.price !== undefined) {
  //       const price = parseFloat(data.price);
  //       console.log(`✅ Successfully fetched ${symbol}, price: ${price}`);
  //       return price;
  //     }

  //     throw new Error(`No valid price data in response for ${symbol}`);
  //   } catch (error) {
  //     console.error(`❌ Failed to fetch ${symbol}:`, error);
  //     throw error;
  //   }
  // }

  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    try {
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
