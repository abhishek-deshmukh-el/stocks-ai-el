/**
 * Stock Service Orchestrator
 * Central service that determines which stock API provider to use
 * and routes requests accordingly
 */

import { alphaVantageService } from "./us/alphavantage.service";
import { finnhubService } from "./us/finnhub.service";
import { twelveDataService } from "./us/twelvedata.service";
import { nseService } from "./in/nse.service";
import { StockData } from "../volatility";

class StockOrchestrator {
  /**
   * Fetch current stock price from Finnhub
   */
  async fetchCurrentPrice(symbol: string): Promise<number> {
    return finnhubService.fetchCurrentPrice(symbol);
  }

  /**
   * Fetch historical stock data from TwelveData
   */
  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    return twelveDataService.fetchHistoricalData(symbol, days);
  }

  /**
   * Fetch stock recommendations from Finnhub
   */
  async fetchRecommendations(symbol: string): Promise<any[]> {
    return finnhubService.fetchRecommendations(symbol);
  }
}

// Export singleton instance
export const stockOrchestrator = new StockOrchestrator();
