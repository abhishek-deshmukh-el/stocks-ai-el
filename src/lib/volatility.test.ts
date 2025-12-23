/**
 * Comprehensive test suite for volatility.ts
 * Tests validation, ATR calculation, volatility stop logic, and trailing stop functionality
 */

import {
  StockData,
  VolatilityStop,
  VolatilityStopResult,
  ATRResult,
  ValidationError,
  calculateATR,
  calculateATRSeries,
  calculateVolatilityStop,
  calculateVolatilityStopTrailing,
  sortByDate,
  validateChronologicalOrder,
  roundVolatilityResult,
  roundATRResult,
} from "./volatility";

describe("Volatility Module Tests", () => {
  // Sample stock data for testing
  const validStockData: StockData[] = [
    { date: "2024-01-01", high: 100, low: 95, close: 98 },
    { date: "2024-01-02", high: 102, low: 97, close: 100 },
    { date: "2024-01-03", high: 105, low: 99, close: 103 },
    { date: "2024-01-04", high: 108, low: 102, close: 105 },
    { date: "2024-01-05", high: 110, low: 104, close: 107 },
    { date: "2024-01-08", high: 112, low: 106, close: 109 },
    { date: "2024-01-09", high: 115, low: 108, close: 112 },
    { date: "2024-01-10", high: 118, low: 111, close: 115 },
    { date: "2024-01-11", high: 120, low: 113, close: 117 },
    { date: "2024-01-12", high: 122, low: 115, close: 119 },
    { date: "2024-01-15", high: 125, low: 118, close: 122 },
    { date: "2024-01-16", high: 127, low: 120, close: 124 },
    { date: "2024-01-17", high: 130, low: 123, close: 127 },
    { date: "2024-01-18", high: 132, low: 125, close: 129 },
    { date: "2024-01-19", high: 135, low: 128, close: 132 },
  ];

  describe("Data Validation", () => {
    test("should accept valid stock data", () => {
      expect(() => calculateATRSeries(validStockData, 14)).not.toThrow();
    });

    test("should throw ValidationError for insufficient data", () => {
      const insufficientData = validStockData.slice(0, 5);
      expect(() => calculateATRSeries(insufficientData, 14)).toThrow(ValidationError);
      expect(() => calculateATRSeries(insufficientData, 14)).toThrow(
        "Need at least 15 data points to calculate ATR, got 5"
      );
    });

    test("should throw ValidationError for invalid high value", () => {
      const invalidData = [
        ...validStockData.slice(0, 10),
        { date: "2024-01-20", high: NaN, low: 100, close: 105 },
        ...validStockData.slice(10),
      ];
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(ValidationError);
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(/Invalid high at index/);
    });

    test("should throw ValidationError for invalid low value", () => {
      const invalidData = [
        ...validStockData.slice(0, 10),
        { date: "2024-01-20", high: 110, low: Infinity, close: 105 },
        ...validStockData.slice(10),
      ];
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(ValidationError);
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(/Invalid low at index/);
    });

    test("should throw ValidationError for invalid close value", () => {
      const invalidData = [
        ...validStockData.slice(0, 10),
        { date: "2024-01-20", high: 110, low: 100, close: -Infinity },
        ...validStockData.slice(10),
      ];
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(ValidationError);
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(/Invalid close at index/);
    });

    test("should throw ValidationError when high < low", () => {
      const invalidData = [
        ...validStockData.slice(0, 10),
        { date: "2024-01-20", high: 100, low: 110, close: 105 },
        ...validStockData.slice(10),
      ];
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(ValidationError);
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(/High must be >= low/);
    });

    test("should throw ValidationError for invalid date", () => {
      const invalidData = [
        ...validStockData.slice(0, 10),
        { date: "", high: 110, low: 100, close: 105 },
        ...validStockData.slice(10),
      ];
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(ValidationError);
      expect(() => calculateATRSeries(invalidData, 14)).toThrow(/Invalid date at index/);
    });

    test("should throw ValidationError for non-chronological data", () => {
      const unorderedData = [
        { date: "2024-01-03", high: 105, low: 99, close: 103 },
        { date: "2024-01-01", high: 100, low: 95, close: 98 },
        { date: "2024-01-02", high: 102, low: 97, close: 100 },
      ];
      expect(() => validateChronologicalOrder(unorderedData)).toThrow(ValidationError);
      expect(() => validateChronologicalOrder(unorderedData)).toThrow(
        /Data not in chronological order/
      );
    });
  });

  describe("Sort and Order Functions", () => {
    test("should sort data by date in ascending order", () => {
      const unorderedData = [
        { date: "2024-01-03", high: 105, low: 99, close: 103 },
        { date: "2024-01-01", high: 100, low: 95, close: 98 },
        { date: "2024-01-02", high: 102, low: 97, close: 100 },
      ];
      const sorted = sortByDate(unorderedData);
      expect(sorted[0].date).toBe("2024-01-01");
      expect(sorted[1].date).toBe("2024-01-02");
      expect(sorted[2].date).toBe("2024-01-03");
    });

    test("should not mutate original array when sorting", () => {
      const originalData = [
        { date: "2024-01-03", high: 105, low: 99, close: 103 },
        { date: "2024-01-01", high: 100, low: 95, close: 98 },
      ];
      const sorted = sortByDate(originalData);
      expect(originalData[0].date).toBe("2024-01-03");
      expect(sorted[0].date).toBe("2024-01-01");
    });

    test("should validate chronological order correctly", () => {
      expect(() => validateChronologicalOrder(validStockData)).not.toThrow();
    });
  });

  describe("ATR Calculation", () => {
    test("should calculate ATR series correctly", () => {
      const atrSeries = calculateATRSeries(validStockData, 5);
      expect(atrSeries.length).toBe(10); // 15 data points - 5 period = 10 results
      expect(atrSeries[0].atr).toBeGreaterThan(0);
      expect(atrSeries[0].date).toBe("2024-01-08"); // ATR starts at period+1 index
    });

    test("should calculate single ATR value correctly", () => {
      const atr = calculateATR(validStockData, 5);
      expect(atr).toBeGreaterThan(0);
      expect(typeof atr).toBe("number");
      expect(Number.isFinite(atr)).toBe(true);
    });

    test("should return correct number of ATR values", () => {
      const period = 10;
      const atrSeries = calculateATRSeries(validStockData, period);
      expect(atrSeries.length).toBe(validStockData.length - period);
    });

    test("should calculate increasing ATR for increasing volatility", () => {
      const volatileData: StockData[] = [
        { date: "2024-01-01", high: 100, low: 99, close: 99.5 },
        { date: "2024-01-02", high: 101, low: 99, close: 100 },
        { date: "2024-01-03", high: 103, low: 98, close: 101 },
        { date: "2024-01-04", high: 106, low: 97, close: 102 },
        { date: "2024-01-05", high: 110, low: 95, close: 103 },
        { date: "2024-01-08", high: 115, low: 92, close: 104 },
        { date: "2024-01-09", high: 120, low: 88, close: 105 },
        { date: "2024-01-10", high: 125, low: 85, close: 106 },
        { date: "2024-01-11", high: 130, low: 80, close: 107 },
        { date: "2024-01-12", high: 135, low: 75, close: 108 },
      ];
      const atrSeries = calculateATRSeries(volatileData, 5);
      // Verify ATR increases as volatility increases
      expect(atrSeries[atrSeries.length - 1].atr).toBeGreaterThan(atrSeries[0].atr);
    });

    test("should round ATR results correctly", () => {
      const atrResult: ATRResult = { date: "2024-01-01", atr: 3.456789 };
      const rounded = roundATRResult(atrResult, 2);
      expect(rounded.atr).toBe(3.46);
    });
  });

  describe("Volatility Stop Calculation", () => {
    test("should calculate volatility stop with HOLD recommendation", () => {
      const result = calculateVolatilityStop(100, 2.5, 2.0);
      expect(result.stopLoss).toBe(95); // 100 - (2.5 * 2.0)
      expect(result.stopLossPercentage).toBe(5);
      expect(result.recommendation).toBe("HOLD");
      expect(result.atr).toBe(2.5);
    });

    test("should calculate volatility stop with SELL recommendation for high volatility", () => {
      const result = calculateVolatilityStop(100, 6, 2.0);
      expect(result.stopLoss).toBe(88); // 100 - (6 * 2.0)
      expect(result.stopLossPercentage).toBe(12);
      expect(result.recommendation).toBe("SELL"); // > 10% is high volatility
    });

    test("should return SELL when forceSell is true", () => {
      const result = calculateVolatilityStop(100, 2, 2.0, true);
      expect(result.recommendation).toBe("SELL");
    });

    test("should only return HOLD or SELL, never BUY", () => {
      // Test various scenarios to ensure BUY is never returned
      const scenarios = [
        { price: 100, atr: 1, multiplier: 2.0, forceSell: false }, // Low volatility
        { price: 100, atr: 3, multiplier: 2.0, forceSell: false }, // Medium volatility
        { price: 100, atr: 6, multiplier: 2.0, forceSell: false }, // High volatility
        { price: 100, atr: 10, multiplier: 2.0, forceSell: false }, // Very high volatility
      ];

      scenarios.forEach((scenario) => {
        const result = calculateVolatilityStop(
          scenario.price,
          scenario.atr,
          scenario.multiplier,
          scenario.forceSell
        );
        expect(["HOLD", "SELL"]).toContain(result.recommendation);
        expect(result.recommendation).not.toBe("BUY");
      });
    });

    test("should throw ValidationError for invalid current price", () => {
      expect(() => calculateVolatilityStop(0, 2, 2.0)).toThrow(ValidationError);
      expect(() => calculateVolatilityStop(-100, 2, 2.0)).toThrow(ValidationError);
      expect(() => calculateVolatilityStop(NaN, 2, 2.0)).toThrow(ValidationError);
    });

    test("should throw ValidationError for invalid ATR", () => {
      expect(() => calculateVolatilityStop(100, -2, 2.0)).toThrow(ValidationError);
      expect(() => calculateVolatilityStop(100, NaN, 2.0)).toThrow(ValidationError);
    });

    test("should throw ValidationError for invalid multiplier", () => {
      expect(() => calculateVolatilityStop(100, 2, 0)).toThrow(ValidationError);
      expect(() => calculateVolatilityStop(100, 2, -1)).toThrow(ValidationError);
      expect(() => calculateVolatilityStop(100, 2, NaN)).toThrow(ValidationError);
    });

    test("should calculate correct stop loss percentage", () => {
      const result = calculateVolatilityStop(100, 3, 2.0);
      const expectedStopLoss = 100 - 3 * 2.0; // 94
      const expectedPercentage = ((100 - 94) / 100) * 100; // 6%
      expect(result.stopLoss).toBe(expectedStopLoss);
      expect(result.stopLossPercentage).toBe(expectedPercentage);
    });
  });

  describe("Volatility Stop Trailing", () => {
    test("should calculate trailing stop series", () => {
      const results = calculateVolatilityStopTrailing(validStockData, 5, 2.0);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].date).toBe("2024-01-08"); // Trailing stop starts at period+1 index
      expect(results[0].signal).toBe("HOLD");
    });

    test("should only return HOLD or SELL signals, never BUY", () => {
      const results = calculateVolatilityStopTrailing(validStockData, 5, 2.0);
      results.forEach((result) => {
        expect(["HOLD", "SELL"]).toContain(result.signal);
        expect(result.signal).not.toBe("BUY");
      });
    });

    test("should generate SELL signal when price crosses below stop", () => {
      const trendingData: StockData[] = [
        { date: "2024-01-01", high: 100, low: 95, close: 98 },
        { date: "2024-01-02", high: 102, low: 97, close: 100 },
        { date: "2024-01-03", high: 105, low: 99, close: 103 },
        { date: "2024-01-04", high: 108, low: 102, close: 105 },
        { date: "2024-01-05", high: 110, low: 104, close: 107 },
        { date: "2024-01-08", high: 112, low: 106, close: 109 },
        { date: "2024-01-09", high: 115, low: 108, close: 112 },
        { date: "2024-01-10", high: 118, low: 111, close: 115 },
        { date: "2024-01-11", high: 120, low: 113, close: 117 },
        { date: "2024-01-12", high: 122, low: 115, close: 119 },
        // Big drop below trailing stop
        { date: "2024-01-15", high: 100, low: 85, close: 90 },
        { date: "2024-01-16", high: 95, low: 80, close: 85 },
      ];

      const results = calculateVolatilityStopTrailing(trendingData, 5, 2.0);
      // Find the SELL signal after the big drop
      const sellSignals = results.filter((r) => r.signal === "SELL");
      expect(sellSignals.length).toBeGreaterThan(0);
    });

    test("should maintain uptrend and downtrend states", () => {
      const results = calculateVolatilityStopTrailing(validStockData, 5, 2.0);
      results.forEach((result) => {
        expect(["UP", "DOWN"]).toContain(result.trend);
      });
    });

    test("should calculate stop loss percentage correctly", () => {
      const results = calculateVolatilityStopTrailing(validStockData, 5, 2.0);
      results.forEach((result) => {
        expect(result.stopLossPercentage).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.stopLossPercentage)).toBe(true);
      });
    });

    test("should throw ValidationError for invalid multiplier", () => {
      expect(() => calculateVolatilityStopTrailing(validStockData, 5, 0)).toThrow(ValidationError);
      expect(() => calculateVolatilityStopTrailing(validStockData, 5, -1)).toThrow(ValidationError);
    });

    test("should include all required fields in results", () => {
      const results = calculateVolatilityStopTrailing(validStockData, 5, 2.0);
      results.forEach((result) => {
        expect(result).toHaveProperty("date");
        expect(result).toHaveProperty("close");
        expect(result).toHaveProperty("atr");
        expect(result).toHaveProperty("stopLoss");
        expect(result).toHaveProperty("stopLossPercentage");
        expect(result).toHaveProperty("trend");
        expect(result).toHaveProperty("signal");
      });
    });

    test("should round volatility results correctly", () => {
      const result: VolatilityStopResult = {
        date: "2024-01-01",
        close: 100.456789,
        atr: 3.123456,
        stopLoss: 95.234567,
        stopLossPercentage: 5.678901,
        trend: "UP",
        signal: "HOLD",
      };
      const rounded = roundVolatilityResult(result, 2);
      expect(rounded.close).toBe(100.46);
      expect(rounded.atr).toBe(3.12);
      expect(rounded.stopLoss).toBe(95.23);
      expect(rounded.stopLossPercentage).toBe(5.68);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    test("should handle minimum required data points", () => {
      const minData = validStockData.slice(0, 15); // Exactly 15 points for period 14
      expect(() => calculateATRSeries(minData, 14)).not.toThrow();
      const results = calculateATRSeries(minData, 14);
      expect(results.length).toBe(1);
    });

    test("should handle very high ATR values", () => {
      const result = calculateVolatilityStop(100, 50, 1.0);
      expect(result.stopLoss).toBe(50);
      expect(result.stopLossPercentage).toBe(50);
      expect(result.recommendation).toBe("SELL"); // Very high volatility
    });

    test("should handle very low ATR values", () => {
      const result = calculateVolatilityStop(100, 0.1, 2.0);
      expect(result.stopLoss).toBe(99.8);
      expect(result.stopLossPercentage).toBeCloseTo(0.2, 1);
      expect(result.recommendation).toBe("HOLD"); // Low volatility
    });

    test("should handle identical consecutive prices", () => {
      const flatData: StockData[] = [
        { date: "2024-01-01", high: 100, low: 100, close: 100 },
        { date: "2024-01-02", high: 100, low: 100, close: 100 },
        { date: "2024-01-03", high: 100, low: 100, close: 100 },
        { date: "2024-01-04", high: 100, low: 100, close: 100 },
        { date: "2024-01-05", high: 100, low: 100, close: 100 },
        { date: "2024-01-08", high: 100, low: 100, close: 100 },
      ];
      const atr = calculateATR(flatData, 4);
      expect(atr).toBe(0); // No volatility
    });

    test("should handle large price movements", () => {
      const volatileData: StockData[] = [
        { date: "2024-01-01", high: 100, low: 95, close: 98 },
        { date: "2024-01-02", high: 200, low: 95, close: 190 },
        { date: "2024-01-03", high: 50, low: 40, close: 45 },
        { date: "2024-01-04", high: 180, low: 40, close: 170 },
        { date: "2024-01-05", high: 80, low: 60, close: 65 },
        { date: "2024-01-08", high: 150, low: 60, close: 140 },
      ];
      expect(() => calculateATR(volatileData, 4)).not.toThrow();
      const atr = calculateATR(volatileData, 4);
      expect(atr).toBeGreaterThan(0);
    });

    test("should handle different multiplier values", () => {
      const multipliers = [1.0, 1.5, 2.0, 2.5, 3.0];
      multipliers.forEach((mult) => {
        const result = calculateVolatilityStop(100, 3, mult);
        expect(result.stopLoss).toBe(100 - 3 * mult);
        expect(result.atr).toBe(3);
      });
    });
  });

  describe("Integration Tests", () => {
    test("should work end-to-end with real-world-like data", () => {
      // Simulate a stock that goes up, then has a pullback
      const realWorldData: StockData[] = [
        { date: "2024-01-01", high: 100, low: 98, close: 99 },
        { date: "2024-01-02", high: 101, low: 99, close: 100.5 },
        { date: "2024-01-03", high: 102, low: 100, close: 101.5 },
        { date: "2024-01-04", high: 103, low: 101, close: 102.5 },
        { date: "2024-01-05", high: 104, low: 102, close: 103.5 },
        { date: "2024-01-08", high: 105, low: 103, close: 104.5 },
        { date: "2024-01-09", high: 106, low: 104, close: 105.5 },
        { date: "2024-01-10", high: 107, low: 105, close: 106.5 },
        { date: "2024-01-11", high: 108, low: 106, close: 107.5 },
        { date: "2024-01-12", high: 109, low: 107, close: 108.5 },
        { date: "2024-01-15", high: 110, low: 108, close: 109.5 },
        { date: "2024-01-16", high: 111, low: 109, close: 110.5 },
        { date: "2024-01-17", high: 112, low: 110, close: 111.5 },
        { date: "2024-01-18", high: 113, low: 111, close: 112.5 },
        { date: "2024-01-19", high: 114, low: 112, close: 113.5 },
      ];

      // Calculate ATR
      const atr = calculateATR(realWorldData, 10);
      expect(atr).toBeGreaterThan(0);

      // Calculate volatility stop
      const currentPrice = realWorldData[realWorldData.length - 1].close;
      const stopResult = calculateVolatilityStop(currentPrice, atr, 2.0);
      expect(stopResult.recommendation).toMatch(/HOLD|SELL/);
      expect(stopResult.stopLoss).toBeLessThan(currentPrice);

      // Calculate trailing stop
      const trailingResults = calculateVolatilityStopTrailing(realWorldData, 10, 2.0);
      expect(trailingResults.length).toBeGreaterThan(0);
      trailingResults.forEach((result) => {
        expect(result.signal).toMatch(/HOLD|SELL/);
      });
    });

    test("should sort unsorted data and calculate correctly", () => {
      const unsortedData = [
        { date: "2024-01-05", high: 110, low: 104, close: 107 },
        { date: "2024-01-01", high: 100, low: 95, close: 98 },
        { date: "2024-01-03", high: 105, low: 99, close: 103 },
        { date: "2024-01-02", high: 102, low: 97, close: 100 },
        { date: "2024-01-04", high: 108, low: 102, close: 105 },
        { date: "2024-01-08", high: 112, low: 106, close: 109 },
      ];

      const sorted = sortByDate(unsortedData);
      expect(() => calculateATR(sorted, 4)).not.toThrow();
    });
  });
});
