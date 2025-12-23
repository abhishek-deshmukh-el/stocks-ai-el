/**
 * DMA Akshat - Simplified Swing Trading Strategy
 * Focus: Quality stocks (META, AMZN, etc.) with practical entry/exit points
 */

export interface DMADataAkshat {
  date: string;
  close: number;
  dma50?: number;
  dma150?: number;
  dma200?: number;
}

export interface DMAAnalysisAkshat {
  currentPrice: number;
  dma50: number;
  dma150: number;
  dma200: number;
  trendState: "BULLISH" | "BEARISH" | "NEUTRAL";
  signal: "BUY_AT_150DMA" | "REDUCE_30_PERCENT" | "HOLD" | "WAIT";
  distanceFrom50DMAPercent: number;
  distanceFrom150DMAPercent: number;
  distanceFrom200DMAPercent: number;
  recommendation: string;
  details: string[];
}

/**
 * Calculate Simple Moving Average (SMA/DMA)
 */
export function calculateDMAAkshat(data: DMADataAkshat[], period: number): number[] {
  if (data.length < period) {
    return [];
  }

  const dmas: number[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    dmas.push(sum / period);
  }

  return dmas;
}

/**
 * Add DMA values to stock data
 */
export function addDMAValuesAkshat(data: DMADataAkshat[]): DMADataAkshat[] {
  if (data.length < 200) {
    return data;
  }

  // Sort data by date (oldest first)
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dma50Values = calculateDMAAkshat(sortedData, 50);
  const dma150Values = calculateDMAAkshat(sortedData, 150);
  const dma200Values = calculateDMAAkshat(sortedData, 200);

  return sortedData.map((item, index) => ({
    ...item,
    dma50: index >= 49 ? dma50Values[index - 49] : undefined,
    dma150: index >= 149 ? dma150Values[index - 149] : undefined,
    dma200: index >= 199 ? dma200Values[index - 199] : undefined,
  }));
}

/**
 * Akshat's Swing Trading Logic
 * - BUY: When price is at 150 DMA (good entry point)
 * - REDUCE 30%: When price is 10-15% above 50 DMA (take profits)
 */
export function analyzeDMAAkshat(historicalData: DMADataAkshat[]): DMAAnalysisAkshat | null {
  if (historicalData.length < 200) {
    return null; // Need at least 200 days for 200 DMA
  }

  // Ensure data has DMA values calculated
  const dataWithDMAs = addDMAValuesAkshat(historicalData);

  // Get the most recent data point
  const latest = dataWithDMAs[dataWithDMAs.length - 1];

  if (!latest.dma50 || !latest.dma150 || !latest.dma200) {
    return null;
  }

  const price = latest.close;
  const dma50 = latest.dma50;
  const dma150 = latest.dma150;
  const dma200 = latest.dma200;

  // Calculate distances from DMAs
  const distanceFrom50DMAPercent = ((price - dma50) / dma50) * 100;
  const distanceFrom150DMAPercent = ((price - dma150) / dma150) * 100;
  const distanceFrom200DMAPercent = ((price - dma200) / dma200) * 100;

  // Determine trend state based on price vs 200 DMA
  let trendState: "BULLISH" | "BEARISH" | "NEUTRAL";
  const percentDiff200 = ((price - dma200) / dma200) * 100;

  if (percentDiff200 > 2) trendState = "BULLISH";
  else if (percentDiff200 < -2) trendState = "BEARISH";
  else trendState = "NEUTRAL";

  let signal: DMAAnalysisAkshat["signal"] = "WAIT";
  let recommendation = "";
  const details: string[] = [];

  // LOGIC 1: BUY at 150 DMA (within 2% tolerance)
  const near150DMA = Math.abs(distanceFrom150DMAPercent) <= 2;
  const above200DMA = price > dma200; // Only buy if above long-term trend

  if (near150DMA && above200DMA) {
    signal = "BUY_AT_150DMA";
    recommendation = "Strong Buy - Entry at 150 DMA";
    details.push("🟢 Price at 150 DMA - Perfect entry point");
    details.push(`✓ Price: ${price.toFixed(2)}`);
    details.push(`✓ 150 DMA: ${dma150.toFixed(2)}`);
    details.push(`✓ Distance from 150 DMA: ${distanceFrom150DMAPercent.toFixed(2)}%`);
    details.push("✓ Above 200 DMA - Bullish trend intact");
    details.push("📌 Action: BUY for swing trade");
  }
  // LOGIC 2: REDUCE 30% when 10-15% above 50 DMA (take profits)
  else if (distanceFrom50DMAPercent >= 10 && distanceFrom50DMAPercent <= 15) {
    signal = "REDUCE_30_PERCENT";
    recommendation = "Take Profits - Reduce 30% position";
    details.push("🟡 Price extended 10-15% above 50 DMA");
    details.push(`✓ Price: ${price.toFixed(2)}`);
    details.push(`✓ 50 DMA: ${dma50.toFixed(2)}`);
    details.push(`✓ Extension: ${distanceFrom50DMAPercent.toFixed(2)}%`);
    details.push("📌 Action: REDUCE position by 30%");
    details.push("💡 Lock in profits, keep 70% for further upside");
  }
  // If price is MORE than 15% above 50 DMA, suggest more aggressive profit taking
  else if (distanceFrom50DMAPercent > 15) {
    signal = "REDUCE_30_PERCENT";
    recommendation = "Highly Extended - Consider larger reduction";
    details.push("🔴 Price extended >15% above 50 DMA");
    details.push(`✓ Price: ${price.toFixed(2)}`);
    details.push(`✓ 50 DMA: ${dma50.toFixed(2)}`);
    details.push(`✓ Extension: ${distanceFrom50DMAPercent.toFixed(2)}%`);
    details.push("📌 Action: REDUCE position by 30-50%");
    details.push("⚠️ Highly extended - consider reducing more");
  }
  // HOLD: Already in position, not at profit-taking level yet
  else if (price > dma150 && distanceFrom50DMAPercent < 10 && distanceFrom50DMAPercent > 0) {
    signal = "HOLD";
    recommendation = "Hold Position";
    details.push("🔵 In good position, not at profit-taking level yet");
    details.push(`✓ Price: ${price.toFixed(2)}`);
    details.push(`✓ Above 150 DMA: ${dma150.toFixed(2)}`);
    details.push(`✓ Distance from 50 DMA: ${distanceFrom50DMAPercent.toFixed(2)}%`);
    details.push("📌 Action: HOLD - Let winners run");
    details.push("💡 Wait for 10%+ extension above 50 DMA to take profits");
  }
  // WAIT: Not at entry point, below 150 DMA
  else {
    signal = "WAIT";
    recommendation = "Wait for better entry";
    details.push("⚪ Not at entry point");
    details.push(`✓ Price: ${price.toFixed(2)}`);
    details.push(`✓ 150 DMA: ${dma150.toFixed(2)}`);
    details.push(`✓ Distance from 150 DMA: ${distanceFrom150DMAPercent.toFixed(2)}%`);

    if (price < dma200) {
      details.push("⚠️ Below 200 DMA - wait for trend confirmation");
    } else {
      details.push("📌 Wait for pullback to 150 DMA for entry");
    }
  }

  return {
    currentPrice: price,
    dma50,
    dma150,
    dma200,
    trendState,
    signal,
    distanceFrom50DMAPercent,
    distanceFrom150DMAPercent,
    distanceFrom200DMAPercent,
    recommendation,
    details,
  };
}

/**
 * Get human-readable signal description
 */
export function getSignalDescriptionAkshat(signal: DMAAnalysisAkshat["signal"]): string {
  const descriptions: Record<DMAAnalysisAkshat["signal"], string> = {
    BUY_AT_150DMA: "BUY - At 150 DMA",
    REDUCE_30_PERCENT: "REDUCE 30%",
    HOLD: "Hold Position",
    WAIT: "Wait for Entry",
  };

  return descriptions[signal];
}

/**
 * Get signal color class for UI
 */
export function getSignalColorClassAkshat(signal: DMAAnalysisAkshat["signal"]): string {
  switch (signal) {
    case "BUY_AT_150DMA":
      return "bg-green-600 hover:bg-green-700";
    case "REDUCE_30_PERCENT":
      return "bg-red-600 hover:bg-red-700";
    case "HOLD":
      return "bg-yellow-600 hover:bg-yellow-700";
    case "WAIT":
      return "bg-yellow-600 hover:bg-yellow-700";
    default:
      return "bg-blue-600 hover:bg-blue-700";
  }
}
