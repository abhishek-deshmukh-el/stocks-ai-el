/**
 * Stock Service Orchestrator
 * Central service that determines which stock API provider to use
 * and routes requests accordingly
 */

import { finnhubService } from "./us/finnhub.service";
import { twelveDataService } from "./us/twelvedata.service";
import { nseService } from "./in/nse.service";
import { StockData } from "../volatility";
import { yahooFinanceService } from "./in/yahoo-finance.service";
import { Region } from "../constants";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class StockOrchestrator {
  private priceCache = new Map<string, CacheEntry<number>>();
  private historicalCache = new Map<string, CacheEntry<StockData[]>>();
  private recommendationsCache = new Map<string, CacheEntry<any[]>>();

  private readonly CACHE_DURATIONS = {
    PRICE: 0.5 * 60 * 60 * 1000, // 30 minutes
    HISTORICAL: 6 * 60 * 60 * 1000, // 6 hours
    RECOMMENDATIONS: 6 * 60 * 60 * 1000, // 6 hours
  };

  private isCacheValid(timestamp: number, duration: number): boolean {
    return Date.now() - timestamp < duration;
  }

  /**
   * Fetch current stock price (cached for 5 minutes)
   * @param symbol - The stock symbol
   * @param region - The market region: Region.US or Region.INDIA
   */
  async fetchCurrentPrice(symbol: string, region: Region = Region.US): Promise<number> {
    const cacheKey = `${symbol}_${region}`;
    const cached = this.priceCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp, this.CACHE_DURATIONS.PRICE)) {
      return cached.data;
    }

    let price: number;
    if (region === Region.INDIA) {
      price = await nseService.fetchCurrentPrice(symbol);
    } else {
      price = await finnhubService.fetchCurrentPrice(symbol);
    }

    this.priceCache.set(cacheKey, { data: price, timestamp: Date.now() });
    return price;
  }

  /**
   * Fetch historical stock data (cached for 1 hour)
   * @param symbol - The stock symbol
   * @param days - Number of days of historical data
   * @param region - The market region: Region.US or Region.INDIA
   */
  async fetchHistoricalData(symbol: string, days: number, region: Region): Promise<StockData[]> {
    const cacheKey = `${symbol}_${days}_${region}`;
    const cached = this.historicalCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp, this.CACHE_DURATIONS.HISTORICAL)) {
      return cached.data;
    }

    let data: StockData[];
    if (region === Region.INDIA) {
      data = await yahooFinanceService.fetchHistoricalData(symbol, days);
    } else {
      data = await twelveDataService.fetchHistoricalData(symbol, days);
    }

    this.historicalCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetch stock recommendations (cached for 1 hour)
   * @param symbol - The stock symbol
   * @param region - The market region: Region.US or Region.INDIA
   * Note: Recommendations are only available for US stocks via Finnhub
   */
  async fetchRecommendations(symbol: string, region: Region = Region.US): Promise<any[]> {
    const cacheKey = `${symbol}_${region}`;
    const cached = this.recommendationsCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp, this.CACHE_DURATIONS.RECOMMENDATIONS)) {
      return cached.data;
    }

    // Recommendations only available for US stocks
    let recommendations: any[];
    if (region === Region.INDIA) {
      recommendations = await nseService.fetchRecommendations(symbol);
    } else {
      recommendations = await finnhubService.fetchRecommendations(symbol);
    }

    this.recommendationsCache.set(cacheKey, { data: recommendations, timestamp: Date.now() });
    return recommendations;
  }
}

// Export singleton instance
export const stockOrchestrator = new StockOrchestrator();
