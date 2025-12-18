/**
 * NSE (National Stock Exchange of India) Service
 * Implementation of stock data fetching using NSE API
 */

import { IStockService } from "./stock-service.interface";
import { StockData } from "../volatility";
import { API_CONFIG } from "../constants";

interface NSEStockData {
  company_name: string;
  last_price: {
    unit: string;
    value: number;
  };
  day_high: {
    unit: string;
    value: number;
  };
  day_low: {
    unit: string;
    value: number;
  };
  open: {
    unit: string;
    value: number;
  };
  previous_close: {
    unit: string;
    value: number;
  };
  change: {
    unit: string;
    value: number;
  };
  percent_change: {
    unit: string;
    value: number;
  };
  volume: {
    unit: string;
    value: number;
  };
  year_high: {
    unit: string;
    value: number;
  };
  year_low: {
    unit: string;
    value: number;
  };
  market_cap: {
    unit: string;
    value: number;
  };
  pe_ratio: {
    unit: string;
    value: number;
  };
  sector: string;
  industry: string;
  last_update: string;
  timestamp: string;
}

interface NSEStockResponse {
  status: string;
  symbol: string;
  ticker: string;
  exchange: string;
  data: NSEStockData;
}

interface NSEBatchResponse {
  status: string;
  response_format: string;
  data: {
    [ticker: string]: NSEStockData;
  };
}

export class NSEService implements IStockService {
  getName(): string {
    return "NSE India";
  }

  /**
   * Convert symbol to NSE format
   * Supports both .NS (NSE) and .BO (BSE) suffixes
   */
  private formatSymbol(symbol: string): string {
    // If symbol already has .NS or .BO, use it as is
    if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) {
      return symbol;
    }

    // Default to NSE
    return `${symbol}.NS`;
  }

  async fetchCurrentPrice(symbol: string): Promise<number> {
    const formattedSymbol = this.formatSymbol(symbol);

    try {
      console.log(`🔍 [NSE] Fetching price for: ${formattedSymbol}`);
      const url = `${API_CONFIG.NSE.BASE_URL}/stock?symbol=${formattedSymbol}`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: NSEStockResponse = await response.json();
      console.log(`📥 Response for ${formattedSymbol}:`, JSON.stringify(data, null, 2));

      // Check response status
      if (data.status !== "success") {
        throw new Error(`NSE API error: Invalid status - ${data.status}`);
      }

      // Extract price
      const price = data.data.last_price.value;

      if (!price || price <= 0) {
        throw new Error(`Invalid price received: ${price}`);
      }

      console.log(`✅ Successfully fetched ${formattedSymbol}, price: ₹${price}`);
      return price;
    } catch (error) {
      console.error(`❌ Failed to fetch ${formattedSymbol}:`, error);
      throw error;
    }
  }

  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    const formattedSymbol = this.formatSymbol(symbol);

    try {
      console.log(`🔍 [NSE] Fetching historical data for: ${formattedSymbol}`);

      // Note: The NSE API provided doesn't include historical data endpoint
      // This is a limitation - we'll need to either:
      // 1. Use a different API for historical data
      // 2. Build historical data from current prices over time
      // 3. Use Alpha Vantage as fallback for historical data

      console.warn(
        `⚠️ NSE API doesn't provide historical data endpoint. Using current price as fallback.`
      );

      // For now, return a single data point with current price
      const currentPrice = await this.fetchCurrentPrice(symbol);
      const today = new Date();

      const historicalData: StockData[] = [];

      // Generate mock historical data (in production, use a proper historical API)
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

      console.log(`⚠️ Generated mock historical data for ${formattedSymbol}`);
      return historicalData;
    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${formattedSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Batch fetch multiple stocks in one API call
   * This is much more efficient than fetching stocks individually
   */
  async batchFetchPrices(symbols: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    if (symbols.length === 0) {
      return prices;
    }

    try {
      // Format all symbols
      const formattedSymbols = symbols.map((s) => this.formatSymbol(s));
      const symbolsParam = formattedSymbols.join(",");

      console.log(`🔍 [NSE] Batch fetching prices for: ${formattedSymbols.join(", ")}`);
      const url = `${API_CONFIG.NSE.BASE_URL}/stock/list?symbols=${symbolsParam}&res=val`;
      console.log(`📡 Fetching URL: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: NSEBatchResponse = await response.json();
      console.log(`📥 Batch response:`, JSON.stringify(data, null, 2));

      // Check response status
      if (data.status !== "success") {
        throw new Error(`NSE API error: Invalid status - ${data.status}`);
      }

      // Extract prices from the response
      for (const [ticker, stockData] of Object.entries(data.data)) {
        const price = stockData.last_price.value;

        if (price && price > 0) {
          // Find the original symbol that matches this ticker
          const originalSymbol = symbols.find((s) => {
            const formatted = this.formatSymbol(s);
            return formatted === ticker || formatted.startsWith(ticker.split(".")[0]);
          });

          if (originalSymbol) {
            prices.set(originalSymbol, price);
            console.log(`✅ ${ticker}: ₹${price}`);
          }
        }
      }

      console.log(`✅ Successfully fetched ${prices.size} stocks in batch`);
      return prices;
    } catch (error) {
      console.error(`❌ Failed to batch fetch prices:`, error);

      // Fallback to individual fetching if batch fails
      console.log(`⚠️ Falling back to individual fetching...`);
      for (const symbol of symbols) {
        try {
          const price = await this.fetchCurrentPrice(symbol);
          prices.set(symbol, price);
        } catch (err) {
          console.error(`❌ Failed to fetch ${symbol}:`, err);
          prices.set(symbol, 0);
        }
      }

      return prices;
    }
  }
}
