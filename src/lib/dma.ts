/**
 * DMA (Daily Moving Average) Trading Framework
 * Implements 50, 150, 200 DMA trend-following strategy
 */

export interface DMAData {
  date: string;
  close: number;
  dma50?: number;
  dma150?: number;
  dma200?: number;
}

export interface DMAAnalysis {
  currentPrice: number;
  dma50: number;
  dma150: number;
  dma200: number;
  trendState: "BULLISH" | "BEARISH" | "NEUTRAL";
  signal:
    | "BUY_SETUP_A"
    | "BUY_SETUP_B"
    | "SELL_PARTIAL"
    | "SELL_MAJORITY"
    | "SELL_FULL"
    | "SHORT"
    | "HOLD"
    | "NO_TRADE";
  signalStrength: "STRONG" | "MODERATE" | "WEAK" | "NONE";
  distanceFromDMA50Percent: number;
  distanceFromDMA200Percent: number;
  dmaAlignment: "BULLISH_ALIGNED" | "BEARISH_ALIGNED" | "MIXED";
  recommendation: string;
  details: string[];
}

/**
 * Calculate Simple Moving Average (SMA/DMA)
 */
export function calculateDMA(data: DMAData[], period: number): number[] {
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
export function addDMAValues(data: DMAData[]): DMAData[] {
  if (data.length < 200) {
    return data;
  }

  // Sort data by date (oldest first)
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dma50Values = calculateDMA(sortedData, 50);
  const dma150Values = calculateDMA(sortedData, 150);
  const dma200Values = calculateDMA(sortedData, 200);

  return sortedData.map((item, index) => ({
    ...item,
    dma50: index >= 49 ? dma50Values[index - 49] : undefined,
    dma150: index >= 149 ? dma150Values[index - 149] : undefined,
    dma200: index >= 199 ? dma200Values[index - 199] : undefined,
  }));
}

/**
 * Determine trend state based on price vs 200 DMA
 */
function getTrendState(price: number, dma200: number): "BULLISH" | "BEARISH" | "NEUTRAL" {
  const percentDiff = ((price - dma200) / dma200) * 100;

  if (percentDiff > 2) return "BULLISH";
  if (percentDiff < -2) return "BEARISH";
  return "NEUTRAL";
}

/**
 * Check DMA alignment
 */
function checkDMAAlignment(
  dma50: number,
  dma150: number,
  dma200: number
): "BULLISH_ALIGNED" | "BEARISH_ALIGNED" | "MIXED" {
  if (dma50 > dma150 && dma150 > dma200) {
    return "BULLISH_ALIGNED";
  }
  if (dma50 < dma150 && dma150 < dma200) {
    return "BEARISH_ALIGNED";
  }
  return "MIXED";
}

/**
 * Check for BUY SETUP A - Strong Trend Continuation
 */
function checkBuySetupA(
  price: number,
  dma50: number,
  dma150: number,
  dma200: number,
  historicalData: DMAData[]
): { signal: boolean; details: string[] } {
  const details: string[] = [];

  // All must be TRUE
  const condition1 = price > dma200;
  const condition2 = dma150 > dma200;
  const condition3 = dma50 > dma150;
  const nearDMA50 = Math.abs((price - dma50) / dma50) * 100 < 3; // Within 3%
  const priceAboveDMA50 = price > dma50;

  if (condition1) details.push("✓ Price > 200 DMA");
  else details.push("✗ Price NOT > 200 DMA");

  if (condition2) details.push("✓ 150 DMA > 200 DMA");
  else details.push("✗ 150 DMA NOT > 200 DMA");

  if (condition3) details.push("✓ 50 DMA > 150 DMA");
  else details.push("✗ 50 DMA NOT > 150 DMA");

  if (nearDMA50 && priceAboveDMA50) details.push("✓ Price near 50 DMA support");
  else if (!nearDMA50) details.push("✗ Price too far from 50 DMA");

  const allConditions = condition1 && condition2 && condition3 && nearDMA50 && priceAboveDMA50;

  return { signal: allConditions, details };
}

/**
 * Check for BUY SETUP B - Trend Reversal
 */
function checkBuySetupB(
  price: number,
  dma50: number,
  dma150: number,
  dma200: number,
  historicalData: DMAData[]
): { signal: boolean; details: string[] } {
  const details: string[] = [];

  // Check recent crossover (in last 5-10 days)
  const recent = historicalData.slice(-10);
  const priceCrossedAbove200 = recent.some((d, i) => {
    if (i === 0) return false;
    const prev = recent[i - 1];
    return prev.close <= (prev.dma200 || 0) && d.close > (d.dma200 || 0);
  });

  const dma50CrossedAbove150 = dma50 > dma150;
  const dma150Flattening = true; // Simplified check

  if (priceCrossedAbove200) details.push("✓ Price crossed above 200 DMA");
  else details.push("✗ No recent cross above 200 DMA");

  if (dma50CrossedAbove150) details.push("✓ 50 DMA > 150 DMA");
  else details.push("✗ 50 DMA NOT > 150 DMA");

  const allConditions = priceCrossedAbove200 && dma50CrossedAbove150;
  details.push("⚠️ Higher risk, higher upside");

  return { signal: allConditions, details };
}

/**
 * Check for SELL signals
 */
function checkSellSignals(
  price: number,
  dma50: number,
  dma150: number,
  dma200: number,
  historicalData: DMAData[]
): { signal: "SELL_PARTIAL" | "SELL_MAJORITY" | "SELL_FULL" | null; details: string[] } {
  const details: string[] = [];

  // SELL FULL - Price closes below 200 DMA
  if (price < dma200) {
    details.push("🔴 FULL EXIT - Price below 200 DMA");
    return { signal: "SELL_FULL", details };
  }

  // SELL MAJORITY - 50 DMA crosses below 150 DMA
  if (dma50 < dma150) {
    details.push("🔴 EXIT MAJORITY - 50 DMA below 150 DMA");
    return { signal: "SELL_MAJORITY", details };
  }

  // SELL PARTIAL - Daily close below 50 DMA
  if (price < dma50) {
    details.push("🟡 PARTIAL EXIT - Price below 50 DMA");
    return { signal: "SELL_PARTIAL", details };
  }

  return { signal: null, details: ["✓ No immediate sell signals"] };
}

/**
 * Check for SHORT opportunity (advanced traders only)
 */
function checkShortSetup(
  price: number,
  dma50: number,
  dma150: number,
  dma200: number,
  historicalData: DMAData[]
): { signal: boolean; details: string[] } {
  const details: string[] = [];

  const condition1 = price < dma200;
  const condition2 = dma50 < dma150 && dma150 < dma200;
  const nearDMA50or150 =
    Math.abs((price - dma50) / dma50) * 100 < 3 || Math.abs((price - dma150) / dma150) * 100 < 3;

  if (condition1) details.push("✓ Price < 200 DMA");
  else details.push("✗ Price NOT < 200 DMA");

  if (condition2) details.push("✓ 50 < 150 < 200 DMA");
  else details.push("✗ DMAs not aligned for short");

  if (nearDMA50or150) details.push("✓ Price near resistance");

  const allConditions = condition1 && condition2 && nearDMA50or150;

  if (allConditions) {
    details.push("⚠️ SHORT SETUP - Advanced traders only");
  }

  return { signal: allConditions, details };
}

/**
 * Check no-trade conditions
 */
function checkNoTradeConditions(
  price: number,
  dma50: number,
  dma150: number,
  dma200: number
): { shouldNotTrade: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check if DMAs are tangled (within 2% of each other)
  const diff50_150 = Math.abs((dma50 - dma150) / dma150) * 100;
  const diff150_200 = Math.abs((dma150 - dma200) / dma200) * 100;
  const diff50_200 = Math.abs((dma50 - dma200) / dma200) * 100;

  if (diff50_150 < 2 || diff150_200 < 2 || diff50_200 < 2) {
    reasons.push("❌ DMAs tangled together");
  }

  // Check if price is extended (>15-20% above 50 DMA)
  const extensionPercent = ((price - dma50) / dma50) * 100;
  if (extensionPercent > 15) {
    reasons.push(`❌ Price extended ${extensionPercent.toFixed(1)}% above 50 DMA`);
  }

  return { shouldNotTrade: reasons.length > 0, reasons };
}

/**
 * Main DMA Analysis Function
 */
export function analyzeDMA(historicalData: DMAData[]): DMAAnalysis | null {
  if (historicalData.length < 200) {
    return null; // Need at least 200 days for 200 DMA
  }

  // Ensure data has DMA values calculated
  const dataWithDMAs = addDMAValues(historicalData);

  // Get the most recent data point
  const latest = dataWithDMAs[dataWithDMAs.length - 1];

  if (!latest.dma50 || !latest.dma150 || !latest.dma200) {
    return null;
  }

  const price = latest.close;
  const dma50 = latest.dma50;
  const dma150 = latest.dma150;
  const dma200 = latest.dma200;

  // Get trend state
  const trendState = getTrendState(price, dma200);

  // Check DMA alignment
  const dmaAlignment = checkDMAAlignment(dma50, dma150, dma200);

  // Calculate distances
  const distanceFromDMA50Percent = ((price - dma50) / dma50) * 100;
  const distanceFromDMA200Percent = ((price - dma200) / dma200) * 100;

  // Check no-trade conditions first
  const noTradeCheck = checkNoTradeConditions(price, dma50, dma150, dma200);

  if (noTradeCheck.shouldNotTrade) {
    return {
      currentPrice: price,
      dma50,
      dma150,
      dma200,
      trendState,
      signal: "NO_TRADE",
      signalStrength: "NONE",
      distanceFromDMA50Percent,
      distanceFromDMA200Percent,
      dmaAlignment,
      recommendation: "No trend = no money",
      details: noTradeCheck.reasons,
    };
  }

  let signal: DMAAnalysis["signal"] = "HOLD";
  let signalStrength: DMAAnalysis["signalStrength"] = "NONE";
  let recommendation = "";
  let details: string[] = [];

  // Check sell signals first (priority)
  const sellCheck = checkSellSignals(price, dma50, dma150, dma200, dataWithDMAs);
  if (sellCheck.signal) {
    signal = sellCheck.signal;
    signalStrength =
      sellCheck.signal === "SELL_FULL"
        ? "STRONG"
        : sellCheck.signal === "SELL_MAJORITY"
          ? "MODERATE"
          : "WEAK";
    recommendation = "Exit position";
    details = sellCheck.details;
  }
  // Check buy setups (only if bullish trend)
  else if (trendState === "BULLISH") {
    const buySetupA = checkBuySetupA(price, dma50, dma150, dma200, dataWithDMAs);
    const buySetupB = checkBuySetupB(price, dma50, dma150, dma200, dataWithDMAs);

    if (buySetupA.signal) {
      signal = "BUY_SETUP_A";
      signalStrength = "STRONG";
      recommendation = "Buy pullback - Best setup";
      details = buySetupA.details;
    } else if (buySetupB.signal) {
      signal = "BUY_SETUP_B";
      signalStrength = "MODERATE";
      recommendation = "Trend reversal - Higher risk";
      details = buySetupB.details;
    } else {
      signal = "HOLD";
      signalStrength = "NONE";
      recommendation = "Wait for pullback to 50 DMA";
      details = ["Bullish trend, but no entry signal yet"];
    }
  }
  // Check short setup (only if bearish trend)
  else if (trendState === "BEARISH") {
    const shortSetup = checkShortSetup(price, dma50, dma150, dma200, dataWithDMAs);

    if (shortSetup.signal) {
      signal = "SHORT";
      signalStrength = "MODERATE";
      recommendation = "Short opportunity (advanced)";
      details = shortSetup.details;
    } else {
      signal = "HOLD";
      signalStrength = "NONE";
      recommendation = "Stay out - Bearish trend";
      details = ["Bearish bias - Only SHORT or stay out"];
    }
  }
  // Neutral trend
  else {
    signal = "HOLD";
    signalStrength = "NONE";
    recommendation = "Capital protection mode";
    details = ["Price chopping around 200 DMA - No clear trend"];
  }

  return {
    currentPrice: price,
    dma50,
    dma150,
    dma200,
    trendState,
    signal,
    signalStrength,
    distanceFromDMA50Percent,
    distanceFromDMA200Percent,
    dmaAlignment,
    recommendation,
    details,
  };
}

/**
 * Get human-readable signal description
 */
export function getSignalDescription(signal: DMAAnalysis["signal"]): string {
  const descriptions: Record<DMAAnalysis["signal"], string> = {
    BUY_SETUP_A: "Strong Buy - Pullback Setup",
    BUY_SETUP_B: "Buy - Reversal Setup",
    SELL_PARTIAL: "Partial Exit (30-50%)",
    SELL_MAJORITY: "Exit Majority",
    SELL_FULL: "FULL EXIT NOW",
    SHORT: "Short Setup",
    HOLD: "Hold Position",
    NO_TRADE: "No Trade Zone",
  };

  return descriptions[signal];
}

/**
 * Get signal color class for UI
 */
export function getSignalColorClass(signal: DMAAnalysis["signal"]): string {
  switch (signal) {
    case "BUY_SETUP_A":
    case "BUY_SETUP_B":
      return "bg-green-600 hover:bg-green-700";
    case "SELL_PARTIAL":
      return "bg-yellow-600 hover:bg-yellow-700";
    case "SELL_MAJORITY":
      return "bg-orange-600 hover:bg-orange-700";
    case "SELL_FULL":
      return "bg-red-600 hover:bg-red-700";
    case "SHORT":
      return "bg-purple-600 hover:bg-purple-700";
    case "NO_TRADE":
      return "bg-gray-600 hover:bg-gray-700";
    case "HOLD":
    default:
      return "bg-blue-600 hover:bg-blue-700";
  }
}
