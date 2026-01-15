/**
 * Yahoo Finance Service for Indian Stocks
 * Implementation using yahoo-finance2 npm package
 */

import YahooFinance from "yahoo-finance2";
import { StockData } from "../../volatility";
import { HistoricalHistoryResult, HistoricalRowHistory } from "yahoo-finance2/modules/historical";

export class YahooFinanceService {
  private yahooFinance: InstanceType<typeof YahooFinance>;

  constructor() {
    // Instantiate yahoo-finance2 as per v3+ requirements
    this.yahooFinance = new YahooFinance();
  }

  /**
   * Fetch historical stock data from Yahoo Finance
   * @param symbol - Stock symbol (e.g., "SBICARD.NS" for NSE stocks)
   * @param days - Number of days of historical data
   */
  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    try {
      console.log(`🔍 [Yahoo Finance] Fetching historical data for: ${symbol}, days: ${days}`);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const queryOptions = {
        period1: startDate.toISOString().split("T")[0], // Start date in 'YYYY-MM-DD' format
        period2: endDate.toISOString().split("T")[0], // End date in 'YYYY-MM-DD' format
        interval: "1d" as const, // Daily interval
      };

      const results: HistoricalRowHistory[] = await this.yahooFinance.historical(
        symbol,
        queryOptions
      );

      if (!results || results.length === 0) {
        throw new Error(`No historical data available for ${symbol}`);
      }

      // Convert to StockData format
      const stockData: StockData[] = results.map((record: HistoricalRowHistory) => ({
        date: record.date instanceof Date ? record.date.toISOString() : record.date,
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
      }));

      console.log(
        `✅ [Yahoo Finance] Successfully fetched ${stockData.length} historical records for ${symbol}`
      );
      return stockData;
    } catch (error: any) {
      console.error(`❌ [Yahoo Finance] Failed to fetch historical data for ${symbol}:`, error);
      throw new Error(
        `Failed to fetch historical data for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Singleton instance of YahooFinanceService
 */
export const yahooFinanceService = new YahooFinanceService();
