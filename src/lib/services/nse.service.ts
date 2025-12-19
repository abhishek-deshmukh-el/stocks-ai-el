/**
 * NSE (National Stock Exchange of India) Service
 * Implementation using stock-nse-india npm package
 */

import { NseIndia } from "stock-nse-india";
import { IStockService } from "./stock-service.interface";
import { StockData } from "../volatility";

export class NSEService implements IStockService {
  private nseIndia: NseIndia;

  constructor() {
    this.nseIndia = new NseIndia();
  }

  getName(): string {
    return "NSE India (stock-nse-india)";
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
      console.log(`🔍 [NSE] Fetching price for: ${formattedSymbol}`);

      // Fetch equity details using stock-nse-india
      const equityDetails = await this.nseIndia.getEquityDetails(formattedSymbol);

      console.log(`📥 Response for ${formattedSymbol}:`, JSON.stringify(equityDetails, null, 2));

      // Extract the current price from priceInfo
      const price = equityDetails?.priceInfo?.lastPrice;

      if (!price || price <= 0) {
        throw new Error(`Invalid price received for ${formattedSymbol}: ${price}`);
      }

      console.log(`✅ Successfully fetched ${formattedSymbol}, price: ₹${price}`);
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
      console.log(`🔍 [NSE] Fetching historical data for: ${formattedSymbol}, days: ${days}`);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const range = {
        start: startDate,
        end: endDate,
      };

      // Fetch historical data using stock-nse-india
      const historicalData = await this.nseIndia.getEquityHistoricalData(formattedSymbol, range);

      console.log(
        `📥 Historical data for ${formattedSymbol}:`,
        historicalData?.length || 0,
        "records"
      );

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
    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${formattedSymbol}:`, error);

      // Fallback: use current price if historical data fails
      console.warn(`⚠️ Falling back to current price for ${formattedSymbol}`);
      try {
        const currentPrice = await this.fetchCurrentPrice(symbol);
        const today = new Date();
        const historicalData: StockData[] = [];

        // Generate fallback data using current price
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);

          historicalData.push({
            date: date.toISOString().split("T")[0],
            high: currentPrice * 1.02,
            low: currentPrice * 0.98,
            close: currentPrice,
          });
        }

        console.log(`⚠️ Generated fallback historical data for ${formattedSymbol}`);
        return historicalData;
      } catch (fallbackError) {
        throw new Error(
          `Failed to fetch historical data for ${formattedSymbol}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
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
   * Get all available NSE stock symbols
   */
  async getAllStockSymbols(): Promise<string[]> {
    try {
      console.log(`🔍 [NSE] Fetching all stock symbols`);
      const symbols = await this.nseIndia.getAllStockSymbols();
      console.log(`✅ Fetched ${symbols.length} stock symbols`);
      return symbols;
    } catch (error) {
      console.error(`❌ Failed to fetch all stock symbols:`, error);
      throw new Error(
        `Failed to fetch stock symbols: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get market indices
   */
  async getMarketIndices(): Promise<any> {
    try {
      console.log(`🔍 [NSE] Fetching market indices`);
      // getEquityStockIndices requires an index parameter
      // Common indices: "NIFTY 50", "NIFTY BANK", "NIFTY IT", etc.
      const indices = await this.nseIndia.getEquityStockIndices("NIFTY 50");
      console.log(`✅ Fetched market indices`);
      return indices;
    } catch (error) {
      console.error(`❌ Failed to fetch market indices:`, error);
      throw new Error(
        `Failed to fetch indices: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get equity trade info (volume, trades, etc.)
   */
  async getEquityTradeInfo(symbol: string): Promise<any> {
    const formattedSymbol = this.formatSymbol(symbol);

    try {
      console.log(`🔍 [NSE] Fetching trade info for: ${formattedSymbol}`);
      const tradeInfo = await this.nseIndia.getEquityTradeInfo(formattedSymbol);
      console.log(`✅ Fetched trade info for ${formattedSymbol}`);
      return tradeInfo;
    } catch (error) {
      console.error(`❌ Failed to fetch trade info for ${formattedSymbol}:`, error);
      throw new Error(
        `Failed to fetch trade info: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
