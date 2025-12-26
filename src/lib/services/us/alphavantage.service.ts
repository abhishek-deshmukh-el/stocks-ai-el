/**
 * Alpha Vantage Stock Service
 * Implementation of stock data fetching using Alpha Vantage API
 */

export class AlphaVantageService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }
    this.apiKey = apiKey;
  }
}

/**
 * Singleton instance of AlphaVantageService
 */
export const alphaVantageService = new AlphaVantageService();
