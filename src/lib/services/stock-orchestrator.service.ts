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

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class StockOrchestrator {
  private priceCache = new Map<string, CacheEntry<number>>();
  private historicalCache = new Map<string, CacheEntry<StockData[]>>();
  private recommendationsCache = new Map<string, CacheEntry<any[]>>();

  private readonly CACHE_DURATIONS = {
    PRICE: 5 * 60 * 1000, // 5 minutes
    HISTORICAL: 60 * 60 * 1000, // 1 hour
    RECOMMENDATIONS: 60 * 60 * 1000, // 1 hour
  };

  private isCacheValid(timestamp: number, duration: number): boolean {
    return Date.now() - timestamp < duration;
  }

  /**
   * Fetch current stock price from Finnhub (cached for 5 minutes)
   */
  async fetchCurrentPrice(symbol: string): Promise<number> {
    const cached = this.priceCache.get(symbol);
    if (cached && this.isCacheValid(cached.timestamp, this.CACHE_DURATIONS.PRICE)) {
      return cached.data;
    }

    const price = await finnhubService.fetchCurrentPrice(symbol);
    this.priceCache.set(symbol, { data: price, timestamp: Date.now() });
    return price;
  }

  /**
   * Fetch historical stock data from TwelveData (cached for 1 hour)
   */
  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    const cacheKey = `${symbol}_${days}`;
    const cached = this.historicalCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp, this.CACHE_DURATIONS.HISTORICAL)) {
      return cached.data;
    }

    const data = await twelveDataService.fetchHistoricalData(symbol, days);
    this.historicalCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetch stock recommendations from Finnhub (cached for 1 hour)
   */
  async fetchRecommendations(symbol: string): Promise<any[]> {
    const cached = this.recommendationsCache.get(symbol);
    if (cached && this.isCacheValid(cached.timestamp, this.CACHE_DURATIONS.RECOMMENDATIONS)) {
      return cached.data;
    }

    const recommendations = await finnhubService.fetchRecommendations(symbol);
    this.recommendationsCache.set(symbol, { data: recommendations, timestamp: Date.now() });
    return recommendations;
  }
}

// Export singleton instance
export const stockOrchestrator = new StockOrchestrator();
