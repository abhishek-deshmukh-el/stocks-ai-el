/**
 * Twelve Data Stock Service
 * Implementation of stock data fetching using Twelve Data API
 * Free tier: 800 API credits/day, 8 credits/minute
 */

import { IStockService } from "./stock-service.interface";
import { StockData } from "../volatility";
import { API_CONFIG } from "../constants";

export class TwelveDataService implements IStockService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      throw new Error("TWELVE_DATA_API_KEY is not configured");
    }
    this.apiKey = apiKey;
  }

  getName(): string {
    return "Twelve Data";
  }

  /**
   * Convert symbols to Twelve Data format
   * Twelve Data uses NSE for Indian stocks
   */
  private getSymbolVariant(symbol: string): string {
    if (symbol.endsWith(".NS")) {
      // Twelve Data uses symbol without suffix, exchange specified separately
      const baseName = symbol.replace(".NS", "");
      console.log(`🔄 Indian stock detected: ${symbol} - Using base: ${baseName}`);
      return baseName;
    }
    if (symbol.endsWith(".BO")) {
      const baseName = symbol.replace(".BO", "");
      console.log(`🔄 Indian stock detected: ${symbol} - Using base: ${baseName}`);
      return baseName;
    }
    console.log(`📊 Using symbol as-is: ${symbol}`);
    return symbol;
  }

  /**
   * Get exchange code for symbol
   */
  private getExchange(symbol: string): string {
    if (symbol.endsWith(".NS")) {
      return "NSE"; // National Stock Exchange of India
    }
    if (symbol.endsWith(".BO")) {
      return "BSE"; // Bombay Stock Exchange
    }
    return "US"; // US exchanges
  }

  async fetchCurrentPrice(symbol: string): Promise<number> {
    const variant = this.getSymbolVariant(symbol);
    const exchange = this.getExchange(symbol);

    try {
      console.log(`🔍 [Twelve Data] Fetching price for: ${variant} on ${exchange}`);
      const url = `${API_CONFIG.TWELVE_DATA.BASE_URL}/price?symbol=${variant}&exchange=${exchange}&apikey=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${variant}:`, JSON.stringify(data, null, 2));

      // Check for error
      if (data.status === "error") {
        console.warn(`⚠️ Twelve Data error for ${variant}:`, data.message);
        throw new Error(`Twelve Data error: ${data.message}`);
      }

      // Twelve Data returns price in 'price' field
      if (data.price !== undefined) {
        const price = parseFloat(data.price);
        console.log(`✅ Successfully fetched ${symbol} using variant: ${variant}, price: ${price}`);
        return price;
      }

      throw new Error(`No valid price data in response for ${variant}`);
    } catch (error) {
      console.error(`❌ Failed to fetch ${variant}:`, error);
      throw error;
    }
  }

  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    const variant = this.getSymbolVariant(symbol);
    const exchange = this.getExchange(symbol);

    try {
      console.log(`🔍 [Twelve Data] Fetching historical data for: ${variant} on ${exchange}`);
      const url = `${API_CONFIG.TWELVE_DATA.BASE_URL}/time_series?symbol=${variant}&exchange=${exchange}&interval=1day&outputsize=${days}&apikey=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${variant} (status):`, data.status || "ok");

      // Check for error
      if (data.status === "error") {
        console.warn(`⚠️ Twelve Data error for ${variant}:`, data.message);
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

      throw new Error(`No time series data in response for ${variant}`);
    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${variant}:`, error);
      throw error;
    }
  }
}
