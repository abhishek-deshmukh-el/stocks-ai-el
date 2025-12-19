/**
 * Stock price data point
 */
export interface StockData {
  date: string;
  high: number;
  low: number;
  close: number;
  open?: number;
  volume?: number;
}

/**
 * Volatility stop result
 */
export interface VolatilityStop {
  atr: number;
  stopLoss: number;
  stopLossPercentage: number;
  recommendation: "HOLD" | "SELL" | "BUY";
}

/**
 * ATR series result with one value per bar
 */
export interface ATRResult {
  date: string;
  atr: number;
}

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validate a single stock data point
 */
function validateStockDataPoint(data: StockData, index: number): void {
  if (!Number.isFinite(data.high)) {
    throw new ValidationError(`Invalid high at index ${index}: ${data.high}`);
  }
  if (!Number.isFinite(data.low)) {
    throw new ValidationError(`Invalid low at index ${index}: ${data.low}`);
  }
  if (!Number.isFinite(data.close)) {
    throw new ValidationError(`Invalid close at index ${index}: ${data.close}`);
  }
  if (data.high < data.low) {
    throw new ValidationError(
      `High must be >= low at index ${index}: high=${data.high}, low=${data.low}`
    );
  }
  if (!data.date || typeof data.date !== "string") {
    throw new ValidationError(`Invalid date at index ${index}`);
  }
}

/**
 * Validate previousClose is a finite number
 */
function validatePreviousClose(previousClose: number, index: number): void {
  if (!Number.isFinite(previousClose)) {
    throw new ValidationError(`Invalid previous close at index ${index}: ${previousClose}`);
  }
}

/**
 * Sort stock data by date in ascending order (oldest first)
 */
export function sortByDate(data: StockData[]): StockData[] {
  return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Validate that data is sorted chronologically
 */
export function validateChronologicalOrder(data: StockData[]): void {
  for (let i = 1; i < data.length; i++) {
    const prevDate = new Date(data[i - 1].date).getTime();
    const currDate = new Date(data[i].date).getTime();
    if (currDate < prevDate) {
      throw new ValidationError(
        `Data not in chronological order at index ${i}: ${data[i - 1].date} > ${data[i].date}`
      );
    }
  }
}

/**
 * Calculate True Range for a single period
 */
function calculateTrueRange(high: number, low: number, previousClose: number): number {
  const highLow = high - low;
  const highPrevClose = Math.abs(high - previousClose);
  const lowPrevClose = Math.abs(low - previousClose);

  return Math.max(highLow, highPrevClose, lowPrevClose);
}

/**
 * Calculate Average True Range (ATR) series - one value per bar
 * @param data Array of stock data points (must be sorted chronologically)
 * @param period ATR period (default 14 days)
 * @returns Array of ATR values, one per bar (starting from bar at index 'period')
 */
export function calculateATRSeries(data: StockData[], period: number = 14): ATRResult[] {
  if (data.length < period + 1) {
    throw new ValidationError(
      `Need at least ${period + 1} data points to calculate ATR, got ${data.length}`
    );
  }

  // Validate all data points
  for (let i = 0; i < data.length; i++) {
    validateStockDataPoint(data[i], i);
    if (i > 0) {
      validatePreviousClose(data[i - 1].close, i - 1);
    }
  }

  validateChronologicalOrder(data);

  const results: ATRResult[] = [];
  const trueRanges: number[] = [];

  // Calculate true ranges
  for (let i = 1; i < data.length; i++) {
    const tr = calculateTrueRange(data[i].high, data[i].low, data[i - 1].close);
    trueRanges.push(tr);
  }

  // Calculate initial ATR using simple moving average
  const initialATR = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  results.push({
    date: data[period].date,
    atr: initialATR,
  });

  // Calculate smoothed ATR for remaining bars
  let atr = initialATR;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    results.push({
      date: data[i + 1].date,
      atr: atr,
    });
  }

  return results;
}

/**
 * Calculate Average True Range (ATR) - returns single value for latest bar
 * @param data Array of stock data points
 * @param period ATR period (default 14 days)
 * @deprecated Use calculateATRSeries for production code
 */
export function calculateATR(data: StockData[], period: number = 14): number {
  const series = calculateATRSeries(data, period);
  return series[series.length - 1].atr;
}

/**
 * Calculate Volatility Stop
 * @param currentPrice Current stock price
 * @param atr Average True Range
 * @param multiplier ATR multiplier (default 2.0 for conservative, 3.0 for aggressive)
 */
export function calculateVolatilityStop(
  currentPrice: number,
  atr: number,
  multiplier: number = 2.0
): VolatilityStop {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new ValidationError(`Invalid current price: ${currentPrice}`);
  }
  if (!Number.isFinite(atr) || atr < 0) {
    throw new ValidationError(`Invalid ATR: ${atr}`);
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new ValidationError(`Invalid multiplier: ${multiplier}`);
  }

  const stopLoss = currentPrice - atr * multiplier;
  const stopLossPercentage = ((currentPrice - stopLoss) / currentPrice) * 100;

  // Determine recommendation based on stop loss distance
  let recommendation: "HOLD" | "SELL" | "BUY";
  if (stopLossPercentage > 10) {
    recommendation = "SELL"; // High volatility, risky
  } else if (stopLossPercentage < 3) {
    recommendation = "BUY"; // Low volatility, stable
  } else {
    recommendation = "HOLD"; // Moderate volatility
  }

  return {
    atr,
    stopLoss,
    stopLossPercentage,
    recommendation,
  };
}

/**
 * Generate sample stock data for demonstration
 */
export function generateSampleData(basePrice: number, days: number = 20): StockData[] {
  const data: StockData[] = [];
  let price = basePrice;

  for (let i = 0; i < days; i++) {
    const volatility = price * 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility;

    price += change;
    const high = price + Math.random() * volatility;
    const low = price - Math.random() * volatility;

    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));

    data.push({
      date: date.toISOString().split("T")[0],
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(price.toFixed(2)),
    });
  }

  return data;
}

/**
 * Calculate Volatility Stop with trailing stop logic
 * This implements a dynamic trailing stop based on ATR with proper crossover signals
 */
export interface VolatilityStopResult {
  date: string;
  close: number;
  atr: number;
  stopLoss: number;
  stopLossPercentage: number;
  trend: "UP" | "DOWN";
  signal: "HOLD" | "SELL" | "BUY";
}

export function calculateVolatilityStopTrailing(
  data: StockData[],
  atrPeriod: number = 14,
  multiplier: number = 2.0
): VolatilityStopResult[] {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new ValidationError(`Invalid multiplier: ${multiplier}`);
  }

  // Get ATR series - this validates the data
  const atrSeries = calculateATRSeries(data, atrPeriod);

  const results: VolatilityStopResult[] = [];
  let previousStop = 0;
  let previousTrend: "UP" | "DOWN" = "UP";

  for (let i = 0; i < atrSeries.length; i++) {
    const dataIndex = atrPeriod + i;
    const currentPrice = data[dataIndex].close;
    const atr = atrSeries[i].atr;

    // Calculate potential stop levels
    const stopUp = currentPrice - multiplier * atr;
    const stopDown = currentPrice + multiplier * atr;

    let stopLoss: number;
    let trend: "UP" | "DOWN";
    let signal: "HOLD" | "SELL" | "BUY" = "HOLD";

    if (i === 0) {
      // Initialize first bar
      stopLoss = stopUp;
      trend = "UP";
    } else {
      const previousPrice = data[dataIndex - 1].close;

      if (previousTrend === "UP") {
        // Uptrend: stop loss rises with price but never falls
        stopLoss = Math.max(previousStop, stopUp);

        // Check for bearish crossover: price crosses below stop
        if (previousPrice >= previousStop && currentPrice < previousStop) {
          // Bearish crossover detected
          signal = "SELL";
          trend = "DOWN";
          stopLoss = stopDown;
        } else {
          trend = "UP";
          // Bullish continuation: check if price is well above stop
          if (currentPrice > stopLoss) {
            signal = "BUY";
          }
        }
      } else {
        // Downtrend: stop loss falls with price but never rises
        stopLoss = Math.min(previousStop, stopDown);

        // Check for bullish crossover: price crosses above stop
        if (previousPrice <= previousStop && currentPrice > previousStop) {
          // Bullish crossover detected
          signal = "BUY";
          trend = "UP";
          stopLoss = stopUp;
        } else {
          trend = "DOWN";
          // Bearish continuation: check if price is well below stop
          if (currentPrice < stopLoss) {
            signal = "SELL";
          }
        }
      }
    }

    const stopLossPercentage = Math.abs(((currentPrice - stopLoss) / currentPrice) * 100);

    results.push({
      date: data[dataIndex].date,
      close: currentPrice,
      atr: atr,
      stopLoss: stopLoss,
      stopLossPercentage: stopLossPercentage,
      trend,
      signal,
    });

    previousStop = stopLoss;
    previousTrend = trend;
  }

  return results;
}

/**
 * Utility function to round volatility results for display
 */
export function roundVolatilityResult(
  result: VolatilityStopResult,
  decimals: number = 2
): VolatilityStopResult {
  return {
    ...result,
    close: Number(result.close.toFixed(decimals)),
    atr: Number(result.atr.toFixed(decimals)),
    stopLoss: Number(result.stopLoss.toFixed(decimals)),
    stopLossPercentage: Number(result.stopLossPercentage.toFixed(decimals)),
  };
}

/**
 * Utility function to round ATR results for display
 */
export function roundATRResult(result: ATRResult, decimals: number = 2): ATRResult {
  return {
    ...result,
    atr: Number(result.atr.toFixed(decimals)),
  };
}
