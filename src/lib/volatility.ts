/**
 * Stock price data point
 */
export interface StockData {
  date: string;
  high: number;
  low: number;
  close: number;
}

/**
 * Volatility stop result
 */
export interface VolatilityStop {
  atr: number;
  stopLoss: number;
  stopLossPercentage: number;
  recommendation: 'HOLD' | 'SELL' | 'BUY';
}

/**
 * Calculate True Range for a single period
 */
function calculateTrueRange(
  high: number,
  low: number,
  previousClose: number
): number {
  const highLow = high - low;
  const highPrevClose = Math.abs(high - previousClose);
  const lowPrevClose = Math.abs(low - previousClose);
  
  return Math.max(highLow, highPrevClose, lowPrevClose);
}

/**
 * Calculate Average True Range (ATR)
 * @param data Array of stock data points
 * @param period ATR period (default 14 days)
 */
export function calculateATR(data: StockData[], period: number = 14): number {
  if (data.length < period + 1) {
    throw new Error(`Need at least ${period + 1} data points to calculate ATR`);
  }

  const trueRanges: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const tr = calculateTrueRange(
      data[i].high,
      data[i].low,
      data[i - 1].close
    );
    trueRanges.push(tr);
  }

  // Calculate initial ATR using simple moving average
  const initialATR =
    trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;

  // Calculate smoothed ATR
  let atr = initialATR;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
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
  const stopLoss = currentPrice - atr * multiplier;
  const stopLossPercentage = ((currentPrice - stopLoss) / currentPrice) * 100;

  // Determine recommendation based on stop loss distance
  let recommendation: 'HOLD' | 'SELL' | 'BUY';
  if (stopLossPercentage > 10) {
    recommendation = 'SELL'; // High volatility, risky
  } else if (stopLossPercentage < 3) {
    recommendation = 'BUY'; // Low volatility, stable
  } else {
    recommendation = 'HOLD'; // Moderate volatility
  }

  return {
    atr: Number(atr.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    stopLossPercentage: Number(stopLossPercentage.toFixed(2)),
    recommendation,
  };
}

/**
 * Generate sample stock data for demonstration
 */
export function generateSampleData(
  basePrice: number,
  days: number = 20
): StockData[] {
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
      date: date.toISOString().split('T')[0],
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(price.toFixed(2)),
    });
  }

  return data;
}
