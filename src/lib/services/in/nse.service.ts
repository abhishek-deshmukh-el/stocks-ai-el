/**
 * NSE (National Stock Exchange of India) Service
 * Implementation using stock-nse-india npm package
 */

import { NseIndia } from "stock-nse-india";
import { StockData } from "../../volatility";

export class NSEService {
  private nseIndia: NseIndia;

  constructor() {
    this.nseIndia = new NseIndia();
  }

  /**
   * Convert symbol to NSE format
   * Remove .NS or .BO suffixes as stock-nse-india expects raw symbols
   */
  private formatSymbol(symbol: string): string {
    // Remove .NS or .BO suffix if present
    return symbol.replace(/\.(NS|BO)$/, "").toUpperCase();
  }

  async fetchCurrentPrice(symbol: string): Promise<number> {
    const formattedSymbol = this.formatSymbol(symbol);

    try {
      // Fetch equity details using stock-nse-india
      const equityDetails = await this.nseIndia.getEquityDetails(formattedSymbol);

      // Extract the current price from priceInfo
      const price = equityDetails?.priceInfo?.lastPrice;

      if (!price || price <= 0) {
        throw new Error(`Invalid price received for ${formattedSymbol}: ${price}`);
      }

      return price;
    } catch (error) {
      console.error(`❌ Failed to fetch ${formattedSymbol}:`, error);
      throw new Error(
        `Failed to fetch price for ${formattedSymbol}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    const formattedSymbol = this.formatSymbol(symbol);

    try {
      console.log(`🔍 [NSE] Attempting historical data for: ${formattedSymbol}, days: ${days}`);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // const range = {
      //   start: startDate,
      //   end: endDate,
      // };

      // // Fetch historical data using stock-nse-india
      // const historicalData = await this.nseIndia.getEquityHistoricalData(formattedSymbol, range);

      const range = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const historicalData = await this.nseIndia.getEquityHistoricalData("IRCTC", range);

      console.log("🚀 ~ NSEService ~ fetchHistoricalData ~ historicalData:", historicalData);

      if (!historicalData || historicalData.length === 0) {
        throw new Error(`No historical data available for ${formattedSymbol}`);
      }

      // Convert to StockData format
      const stockData: StockData[] = historicalData.map((record: any) => ({
        date: record.CH_TIMESTAMP || record.date,
        high: parseFloat(record.CH_TRADE_HIGH_PRICE || record.high || record.CH_CLOSING_PRICE),
        low: parseFloat(record.CH_TRADE_LOW_PRICE || record.low || record.CH_CLOSING_PRICE),
        close: parseFloat(record.CH_CLOSING_PRICE || record.close),
      }));

      console.log(
        `✅ Successfully fetched ${stockData.length} historical records for ${formattedSymbol}`
      );
      return stockData;
    } catch (error: any) {
      console.error(`❌ Failed to fetch historical data for ${formattedSymbol}:`, error);

      // Print detailed error information
      const err = error as any;
      console.log("🔍 Error Details:");
      console.log("  Status:", err.status);
      console.log("  Code:", err.code);
      console.log("  Message:", err.message);
      if (err.response) {
        console.log("  Response Status:", err.response.status);
        console.log("  Response StatusText:", err.response.statusText);
        console.log("  Response Headers:", err.response.headers);
        console.log("  Response Data:", JSON.stringify(err.response.data, null, 2));
        console.log("  Request Data:", JSON.stringify(err.request.data, null, 2));
      }

      throw new Error(
        `Failed to fetch historical data for ${formattedSymbol}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Batch fetch multiple stocks in one API call
   * Note: stock-nse-india doesn't have a native batch endpoint
   * We'll fetch them individually but in parallel for better performance
   */
  async batchFetchPrices(symbols: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    if (symbols.length === 0) {
      return prices;
    }

    try {
      console.log(`🔍 [NSE] Batch fetching prices for ${symbols.length} symbols`);

      // Fetch all symbols in parallel
      const promises = symbols.map(async (symbol) => {
        try {
          const price = await this.fetchCurrentPrice(symbol);
          return { symbol, price };
        } catch (error) {
          console.error(`❌ Failed to fetch ${symbol}:`, error);
          return { symbol, price: 0 };
        }
      });

      const results = await Promise.all(promises);

      // Build the map
      for (const { symbol, price } of results) {
        prices.set(symbol, price);
        if (price > 0) {
          console.log(`✅ ${symbol}: ₹${price}`);
        }
      }

      console.log(`✅ Successfully fetched ${prices.size} stocks in parallel batch`);
      return prices;
    } catch (error) {
      console.error(`❌ Failed to batch fetch prices:`, error);
      throw new Error(
        `Batch fetch failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch stock recommendations for Indian stocks
   * Note: NSE API doesn't provide analyst recommendations like Finnhub
   * Returns empty array as recommendations are not available
   */
  async fetchRecommendations(symbol: string): Promise<any[]> {
    const formattedSymbol = this.formatSymbol(symbol);
    console.log(
      `ℹ️ [NSE] Analyst recommendations not available for Indian stocks: ${formattedSymbol}`
    );
    // NSE API doesn't provide analyst recommendations
    // This method exists for API consistency
    return [];
  }
}

/**
 * Singleton instance of NSEService
 */
export const nseService = new NSEService();
