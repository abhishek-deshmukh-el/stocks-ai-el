/**
 * Alpha Vantage Stock Service
 * Implementation of stock data fetching using Alpha Vantage API
 */

import { IStockService } from "./stock-service.interface";
import { StockData } from "../volatility";
import { API_CONFIG } from "../constants";

export class AlphaVantageService implements IStockService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }
    this.apiKey = apiKey;
  }

  getName(): string {
    return "Alpha Vantage";
  }

  /**
   * Convert Indian stock symbols to BSE format
   */
  private getSymbolVariant(symbol: string): string {
    if (symbol.endsWith(".NS")) {
      const baseName = symbol.replace(".NS", "");
      const bseSymbol = `${baseName}.BSE`;
      console.log(`🔄 Indian stock detected: ${symbol} - Using BSE variant: ${bseSymbol}`);
      return bseSymbol;
    }
    console.log(`📊 Using symbol as-is: ${symbol}`);
    return symbol;
  }

  async fetchCurrentPrice(symbol: string): Promise<number> {
    const variant = this.getSymbolVariant(symbol);

    try {
      console.log(`🔍 [Alpha Vantage] Fetching price for: ${variant}`);
      const url = `${API_CONFIG.ALPHA_VANTAGE.BASE_URL}?function=GLOBAL_QUOTE&symbol=${variant}&apikey=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${variant}:`, JSON.stringify(data, null, 2));

      // Check for API informational messages
      if (data["Information"]) {
        console.warn(`ℹ️ API Information for ${variant}:`, data["Information"]);
        throw new Error(`API limit or info: ${data["Information"]}`);
      }

      // Check for API error messages
      if (data["Error Message"]) {
        console.warn(`⚠️ Alpha Vantage error for ${variant}:`, data["Error Message"]);
        throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
      }

      if (data["Note"]) {
        console.error(`⛔ API rate limit exceeded:`, data["Note"]);
        throw new Error(`API rate limit exceeded: ${data["Note"]}`);
      }

      if (data["Global Quote"] && data["Global Quote"]["05. price"]) {
        const price = parseFloat(data["Global Quote"]["05. price"]);
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

    try {
      console.log(`🔍 [Alpha Vantage] Fetching historical data for: ${variant}`);
      const url = `${API_CONFIG.ALPHA_VANTAGE.BASE_URL}?function=TIME_SERIES_DAILY&symbol=${variant}&outputsize=compact&apikey=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${variant}:`, JSON.stringify(data, null, 2));

      // Check for API informational messages
      if (data["Information"]) {
        console.warn(`ℹ️ API Information for ${variant}:`, data["Information"]);
        throw new Error(`API limit or info: ${data["Information"]}`);
      }

      // Check for API error messages
      if (data["Error Message"]) {
        console.warn(`⚠️ Alpha Vantage error for ${variant}:`, data["Error Message"]);
        throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
      }

      if (data["Note"]) {
        console.error(`⛔ API rate limit exceeded:`, data["Note"]);
        throw new Error(`API rate limit exceeded: ${data["Note"]}`);
      }

      if (data["Time Series (Daily)"]) {
        const timeSeries = data["Time Series (Daily)"];
        const stockData: StockData[] = [];
        const dateCount = Object.keys(timeSeries).length;
        console.log(`📊 Found ${dateCount} days of data for ${variant}`);

        Object.keys(timeSeries)
          .slice(0, days)
          .forEach((date) => {
            const dayData = timeSeries[date];
            stockData.push({
              date,
              high: parseFloat(dayData["2. high"]),
              low: parseFloat(dayData["3. low"]),
              close: parseFloat(dayData["4. close"]),
            });
          });

        console.log(
          `✅ Successfully fetched ${stockData.length} days of historical data for ${symbol} using variant: ${variant}`
        );
        return stockData.reverse();
      }

      throw new Error(`No Time Series data in response for ${variant}`);
    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${variant}:`, error);
      throw error;
    }
  }
}
