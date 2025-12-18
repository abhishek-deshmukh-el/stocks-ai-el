/**
 * Stock Data Fetcher
 * Fetches real-time and historical stock data from APIs
 * Uses different providers based on configuration
 */

import { StockData } from "./volatility";
import { IStockService } from "./services/stock-service.interface";
import { AlphaVantageService } from "./services/alphavantage.service";
import { FinnhubService } from "./services/finnhub.service";
import { TwelveDataService } from "./services/twelvedata.service";
import { NSEService } from "./services/nse.service";

interface StockQuote {
  symbol: string;
  price: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
}

/**
 * Get the configured stock service provider based on symbol
 * Indian stocks (.NS, .BO, .BSE) ALWAYS use NSE service exclusively
 * US stocks use Finnhub or other providers based on configuration
 */
function getStockServiceForSymbol(symbol: string): IStockService {
  // Check if it's an Indian stock - ALWAYS use NSE for Indian stocks
  const isIndianStock = symbol.endsWith(".NS") || symbol.endsWith(".BO") || symbol.endsWith(".BSE");

  if (isIndianStock) {
    console.log(`🇮🇳 Using NSE service for Indian stock: ${symbol}`);
    return new NSEService();
  }

  // For non-Indian stocks, check environment variable for provider override
  const provider = process.env.STOCK_API_PROVIDER?.toLowerCase();

  if (provider === "twelvedata") {
    console.log(`📡 Using Twelve Data for: ${symbol}`);
    return new TwelveDataService();
  }

  if (provider === "alphavantage") {
    console.log(`📡 Using Alpha Vantage for: ${symbol}`);
    return new AlphaVantageService();
  }

  if (provider === "finnhub") {
    console.log(`📡 Using Finnhub for: ${symbol}`);
    return new FinnhubService();
  }

  // Default for US/international stocks
  console.log(`🇺🇸 Using Finnhub for stock: ${symbol}`);
  return new FinnhubService();
}

/**
 * Fetch current stock price
 */
export async function fetchCurrentPrice(symbol: string): Promise<number> {
  const service = getStockServiceForSymbol(symbol);
  return service.fetchCurrentPrice(symbol);
}

/**
 * Fetch historical stock data
 */
export async function fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
  const service = getStockServiceForSymbol(symbol);
  return service.fetchHistoricalData(symbol, days);
}

/**
 * Batch fetch multiple stock prices with intelligent grouping
 * Groups Indian stocks together for batch API call, fetches US stocks individually
 */
export async function batchFetchPrices(
  symbols: string[],
  delayMs: number = 1000
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  // Separate Indian and US stocks
  const indianStocks = symbols.filter(
    (s) => s.endsWith(".NS") || s.endsWith(".BO") || s.endsWith(".BSE")
  );
  const otherStocks = symbols.filter(
    (s) => !s.endsWith(".NS") && !s.endsWith(".BO") && !s.endsWith(".BSE")
  );

  // Batch fetch all Indian stocks in one API call
  if (indianStocks.length > 0) {
    try {
      console.log(`📊 Batch fetching ${indianStocks.length} Indian stocks...`);
      const nseService = new NSEService();
      const indianPrices = await nseService.batchFetchPrices(indianStocks);

      // Merge results
      indianPrices.forEach((price, symbol) => {
        prices.set(symbol, price);
      });
    } catch (error) {
      console.error(`Failed to batch fetch Indian stocks:`, error);
      // Fall back to individual fetching
      for (const symbol of indianStocks) {
        try {
          const price = await fetchCurrentPrice(symbol);
          prices.set(symbol, price);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } catch (err) {
          console.error(`Failed to fetch price for ${symbol}:`, err);
          prices.set(symbol, 0);
        }
      }
    }
  }

  // Fetch other stocks individually with rate limiting
  for (const symbol of otherStocks) {
    try {
      const price = await fetchCurrentPrice(symbol);
      prices.set(symbol, price);

      // Rate limiting delay
      if (otherStocks.indexOf(symbol) < otherStocks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      prices.set(symbol, 0);
    }
  }

  return prices;
}
