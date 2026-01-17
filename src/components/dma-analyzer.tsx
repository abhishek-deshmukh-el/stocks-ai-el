/**
 * DMA Analyzer Component
 * Analyzes stock using Akshat's Swing Trading Strategy
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatPrice } from "@/lib/constants";
import {
  DMAAnalysisAkshat,
  getSignalDescriptionAkshat,
  getSignalColorClassAkshat,
} from "@/lib/dmaAkshat";

interface DMAAnalyzerResponse {
  success: boolean;
  symbol: string;
  data: DMAAnalysisAkshat;
}

export default function DMAAnalyzer() {
  const [symbol, setSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DMAAnalysisAkshat | null>(null);
  const [stockSymbol, setStockSymbol] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/stock/dma/batch?symbols=${symbol}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch DMA data");
      }

      if (result.success && result.results && result.results.length > 0) {
        const dmaResult = result.results[0];
        if (dmaResult.data) {
          setData(dmaResult.data);
          setStockSymbol(symbol);
        } else {
          throw new Error(dmaResult.error || "No DMA data available");
        }
      } else {
        throw new Error("No results returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getTrendBadge = (trend: string) => {
    const colors = {
      BULLISH: "bg-green-600 text-white hover:bg-green-700",
      BEARISH: "bg-red-600 text-white hover:bg-red-700",
      NEUTRAL: "bg-gray-500 text-white hover:bg-gray-600",
    };
    return <Badge className={colors[trend as keyof typeof colors]}>{trend}</Badge>;
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">📈 DMA Strategy Analyzer</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Analyze stocks using Akshat&apos;s Swing Trading Strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <Label htmlFor="symbol" className="text-sm">
                Stock Symbol
              </Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAnalyze();
                  }
                }}
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleAnalyze} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Analyzing..." : "Analyze DMA Signal"}
            </Button>
          </div>

          {error && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {data && stockSymbol && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">DMA Analysis - {stockSymbol}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Akshat&apos;s Swing Trading Strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Current Price
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {formatPrice(data.currentPrice, stockSymbol)}
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">50 DMA</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {formatPrice(data.dma50, stockSymbol)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                    {data.distanceFrom50DMAPercent > 0 ? "+" : ""}
                    {data.distanceFrom50DMAPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">150 DMA</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {formatPrice(data.dma150, stockSymbol)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                    {data.distanceFrom150DMAPercent > 0 ? "+" : ""}
                    {data.distanceFrom150DMAPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">200 DMA</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {formatPrice(data.dma200, stockSymbol)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                    {data.distanceFrom200DMAPercent > 0 ? "+" : ""}
                    {data.distanceFrom200DMAPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Trend and Signal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Trend State
                  </div>
                  {getTrendBadge(data.trendState)}
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Signal
                  </div>
                  <HoverCard>
                    <HoverCardTrigger asChild tabIndex={0}>
                      <Badge
                        variant="outline"
                        className={`${getSignalColorClassAkshat(data.signal)} text-white cursor-help border-0`}
                      >
                        {getSignalDescriptionAkshat(data.signal)}
                      </Badge>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">{data.recommendation}</h4>
                        <div className="text-xs text-muted-foreground">
                          Akshat&apos;s Swing Strategy
                        </div>
                        <div className="space-y-1 pt-2 text-xs">
                          {data.details.map((detail, idx) => (
                            <div key={idx}>{detail}</div>
                          ))}
                        </div>
                        <div className="pt-2 mt-2 border-t text-xs">
                          <div>From 50 DMA: {data.distanceFrom50DMAPercent.toFixed(1)}%</div>
                          <div>From 150 DMA: {data.distanceFrom150DMAPercent.toFixed(1)}%</div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* Detailed Recommendation */}
              <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm sm:text-base">{data.recommendation}</h4>
                <div className="space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {data.details.map((detail, idx) => (
                    <div key={idx}>{detail}</div>
                  ))}
                </div>
              </div>

              {/* Strategy Information */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold mb-2 sm:mb-3 text-xs sm:text-sm">
                  About Akshat&apos;s Swing Strategy
                </h4>
                <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <strong className="text-green-600 dark:text-green-400">🟢 BUY Signal:</strong>{" "}
                    When price touches 150 DMA (±2%) and is above 200 DMA - ideal entry point
                  </div>
                  <div>
                    <strong className="text-yellow-600 dark:text-yellow-400">🟡 REDUCE 30%:</strong>{" "}
                    When price is 10-15% above 50 DMA - take profits
                  </div>
                  <div>
                    <strong className="text-blue-600 dark:text-blue-400">🔵 HOLD:</strong> Position
                    is within acceptable range - maintain current holdings
                  </div>
                  <div>
                    <strong className="text-gray-600 dark:text-gray-400">⚪ WAIT:</strong> No clear
                    setup - wait for better entry opportunity
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
