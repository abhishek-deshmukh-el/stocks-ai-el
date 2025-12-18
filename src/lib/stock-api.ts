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
 * Uses Finnhub for US stocks, Alpha Vantage for Indian stocks, and Twelve Data as fallback
 */
function getStockServiceForSymbol(symbol: string): IStockService {
  // Check if it's an Indian stock
  const isIndianStock = symbol.endsWith(".NS") || symbol.endsWith(".BO") || symbol.endsWith(".BSE");

  // Check environment variable for provider override
  const provider = process.env.STOCK_API_PROVIDER?.toLowerCase();

  // If specific provider is set, use it
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

  // Default behavior: route by region
  if (isIndianStock) {
    console.log(`📡 Using Alpha Vantage for Indian stock: ${symbol}`);
    return new AlphaVantageService();
  } else {
    console.log(`📡 Using Finnhub for US stock: ${symbol}`);
    return new FinnhubService();
  }
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
 * Batch fetch multiple stock prices with rate limiting
 */
export async function batchFetchPrices(
  symbols: string[],
  delayMs: number = 1000
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  for (const symbol of symbols) {
    try {
      const price = await fetchCurrentPrice(symbol);
      prices.set(symbol, price);

      // Rate limiting delay
      if (symbols.indexOf(symbol) < symbols.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      prices.set(symbol, 0);
    }
  }

  return prices;
}
