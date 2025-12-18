/**
 * Stock Service Interface
 * Common interface for all stock data providers
 */

import { StockData } from "../volatility";

export interface IStockService {
  /**
   * Fetch current stock price
   */
  fetchCurrentPrice(symbol: string): Promise<number>;

  /**
   * Fetch historical stock data
   */
  fetchHistoricalData(symbol: string, days: number): Promise<StockData[]>;

  /**
   * Batch fetch multiple stock prices (optional)
   * Services that support batch fetching can implement this for better performance
   */
  batchFetchPrices?(symbols: string[]): Promise<Map<string, number>>;

  /**
   * Get the service name
   */
  getName(): string;
}
