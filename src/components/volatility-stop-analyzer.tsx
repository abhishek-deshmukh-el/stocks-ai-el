/**
 * Volatility Stop Analyzer Component
 * Displays historical data with volatility stop calculations
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface VolatilityStopData {
  date: string;
  close: number;
  atr: number;
  stopLoss: number;
  stopLossPercentage: number;
  trend: "UP" | "DOWN";
  signal: "HOLD" | "SELL" | "BUY";
}

interface HistoricalDataResponse {
  success: boolean;
  symbol: string;
  dateRange: {
    start: string;
    end: string;
  };
  dataPoints: number;
  atr: {
    period: number;
    value: number;
  };
  latest: VolatilityStopData;
  history: VolatilityStopData[];
  summary: {
    currentPrice: number;
    stopLoss: number;
    stopLossPercentage: number;
    trend: string;
    signal: string;
    description: string;
  };
}

export default function VolatilityStopAnalyzer() {
  const [symbol, setSymbol] = useState("AAPL");
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-01");
  const [atrPeriod, setAtrPeriod] = useState("14");
  const [multiplier, setMultiplier] = useState("2.0");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HistoricalDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        symbol,
        start_date: startDate,
        end_date: endDate,
        atr_period: atrPeriod,
        multiplier,
      });

      const response = await fetch(`/api/stock/historical?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getTrendBadge = (trend: string) => {
    return trend === "UP" ? (
      <Badge className="bg-green-500">▲ UPTREND</Badge>
    ) : (
      <Badge className="bg-red-500">▼ DOWNTREND</Badge>
    );
  };

  const getSignalBadge = (signal: string) => {
    const colors = {
      BUY: "bg-green-600",
      HOLD: "bg-yellow-600",
      SELL: "bg-red-600",
    };
    return <Badge className={colors[signal as keyof typeof colors]}>{signal}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Volatility Stop Analyzer</CardTitle>
          <CardDescription>
            Calculate volatility-based trailing stops using historical stock data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="symbol">Stock Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="atrPeriod">ATR Period</Label>
              <Input
                id="atrPeriod"
                type="number"
                value={atrPeriod}
                onChange={(e) => setAtrPeriod(e.target.value)}
                placeholder="14"
              />
            </div>
            <div>
              <Label htmlFor="multiplier">ATR Multiplier</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.1"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                placeholder="2.0"
              />
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={loading} className="w-full md:w-auto">
            {loading ? "Analyzing..." : "Analyze Volatility Stop"}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Summary - {data.symbol}</CardTitle>
              <CardDescription>
                {data.dateRange.start} to {data.dateRange.end} ({data.dataPoints} data points)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">Current Price</div>
                  <div className="text-2xl font-bold">${data.latest.close}</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-gray-600">Stop Loss</div>
                  <div className="text-2xl font-bold">${data.latest.stopLoss}</div>
                  <div className="text-xs text-gray-500">
                    {data.latest.stopLossPercentage}% below
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600">ATR ({data.atr.period} days)</div>
                  <div className="text-2xl font-bold">${data.atr.value.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Status</div>
                  <div className="flex flex-col gap-2">
                    {getTrendBadge(data.latest.trend)}
                    {getSignalBadge(data.latest.signal)}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{data.summary.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Volatility Stop History</CardTitle>
              <CardDescription>Trailing stop levels over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Close</TableHead>
                      <TableHead className="text-right">Stop Loss</TableHead>
                      <TableHead className="text-right">Distance</TableHead>
                      <TableHead className="text-right">Stop %</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Signal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.history
                      .slice(-20)
                      .reverse()
                      .map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell className="text-right font-medium">${row.close}</TableCell>
                          <TableCell className="text-right">${row.stopLoss}</TableCell>
                          <TableCell className="text-right">
                            ${(row.close - row.stopLoss).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">{row.stopLossPercentage}%</TableCell>
                          <TableCell>{getTrendBadge(row.trend)}</TableCell>
                          <TableCell>{getSignalBadge(row.signal)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
