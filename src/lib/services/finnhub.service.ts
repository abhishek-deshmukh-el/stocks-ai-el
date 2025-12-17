/**
 * Finnhub Stock Service
 * Implementation of stock data fetching using Finnhub API
 */

import { IStockService } from "./stock-service.interface";
import { StockData } from "../volatility";
import { API_CONFIG } from "../constants";

export class FinnhubService implements IStockService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  getName(): string {
    return "Finnhub";
  }

  /**
   * Convert Indian stock symbols to Finnhub format
   * Finnhub uses IC (India) exchange code for NSE stocks
   * Format: SYMBOL or just use the base ticker
   */
  private getSymbolVariant(symbol: string): string {
    if (symbol.endsWith('.NS')) {
      // For Indian NSE stocks, Finnhub may use just the base symbol
      // or IC:SYMBOL format (IC = India)
      const baseName = symbol.replace('.NS', '');
      // Try IC exchange format first
      const icSymbol = `${baseName}.NSE`;
      console.log(`🔄 Indian stock detected: ${symbol} - Using Finnhub format: ${icSymbol}`);
      return icSymbol;
    }
    if (symbol.endsWith('.BO')) {
      // Bombay Stock Exchange
      const baseName = symbol.replace('.BO', '');
      const bseSymbol = `${baseName}.BSE`;
      console.log(`🔄 Indian stock detected: ${symbol} - Using BSE format: ${bseSymbol}`);
      return bseSymbol;
    }
    console.log(`📊 Using symbol as-is: ${symbol}`);
    return symbol;
  }

  async fetchCurrentPrice(symbol: string): Promise<number> {
    const variant = this.getSymbolVariant(symbol);
    
    try {
      console.log(`🔍 [Finnhub] Fetching price for: ${variant}`);
      const url = `${API_CONFIG.FINNHUB.BASE_URL}/quote?symbol=${variant}&token=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${variant}:`, JSON.stringify(data, null, 2));
      
      // Check for error
      if (data.error) {
        console.warn(`⚠️ Finnhub error for ${variant}:`, data.error);
        throw new Error(`Finnhub error: ${data.error}`);
      }
      
      // Finnhub returns current price in 'c' field
      if (data.c !== undefined && data.c !== 0) {
        const price = data.c;
        console.log(`✅ Successfully fetched ${symbol} using variant: ${variant}, price: ${price}`);
        return price;
      }
      
      // If no data, try alternate formats for Indian stocks
      if (symbol.endsWith('.NS')) {
        console.warn(`⚠️ No data for ${variant}, trying alternate formats...`);
        return await this.tryAlternateFormats(symbol);
      }
      
      throw new Error(`No valid price data in response for ${variant}`);
    } catch (error) {
      console.error(`❌ Failed to fetch ${variant}:`, error);
      throw error;
    }
  }

  /**
   * Try alternate symbol formats for Indian stocks
   */
  private async tryAlternateFormats(symbol: string): Promise<number> {
    const baseName = symbol.replace('.NS', '');
    const formats = [
      baseName,                    // Just the ticker
      `NSE:${baseName}`,          // NSE: prefix
      `${baseName}.NS`,           // Yahoo Finance format
      `IC:${baseName}`,           // IC exchange code
    ];

    for (const format of formats) {
      try {
        console.log(`🔄 Trying format: ${format}`);
        const url = `${API_CONFIG.FINNHUB.BASE_URL}/quote?symbol=${format}&token=${this.apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.c !== undefined && data.c !== 0) {
          console.log(`✅ Success with format: ${format}, price: ${data.c}`);
          return data.c;
        }
      } catch (error) {
        console.log(`❌ Failed with format: ${format}`);
      }
    }

    throw new Error(`Unable to find valid data for ${symbol} in any format`);
  }

  async fetchHistoricalData(symbol: string, days: number = 30): Promise<StockData[]> {
    const variant = this.getSymbolVariant(symbol);
    
    try {
      console.log(`🔍 [Finnhub] Fetching historical data for: ${variant}`);
      
      // Calculate date range (Finnhub requires unix timestamps)
      const to = Math.floor(Date.now() / 1000);
      const from = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
      
      const url = `${API_CONFIG.FINNHUB.BASE_URL}/stock/candle?symbol=${variant}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`;
      console.log(`📡 Fetching URL: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      console.log(`📥 Response for ${variant} (status):`, data.s);
      
      // Check for error or no data
      if (data.s === 'no_data') {
        throw new Error(`No historical data available for ${variant}`);
      }
      
      if (data.s !== 'ok') {
        throw new Error(`Finnhub error: ${data.s}`);
      }
      
      if (data.c && data.h && data.l && data.t) {
        const stockData: StockData[] = [];
        
        for (let i = 0; i < data.c.length; i++) {
          const date = new Date(data.t[i] * 1000).toISOString().split('T')[0];
          stockData.push({
            date,
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
          });
        }
        
        console.log(`✅ Successfully fetched ${stockData.length} days of historical data for ${symbol}`);
        return stockData;
      }
      
      throw new Error(`Invalid data format in response for ${variant}`);
    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${variant}:`, error);
      throw error;
    }
  }
}
