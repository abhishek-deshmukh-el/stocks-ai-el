"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Recommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

export function StockRecommendations() {
  const [symbol, setSymbol] = useState("TSLA");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRecommendations = async () => {
    if (!symbol) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/stock/recommendations?symbol=${encodeURIComponent(symbol.toUpperCase())}`
      );
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || "Failed to fetch recommendations");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationScore = (rec: Recommendation) => {
    const total = rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
    const bullish = rec.strongBuy + rec.buy;
    const bearish = rec.sell + rec.strongSell;
    const percentage = (bullish / total) * 100;

    return { total, bullish, bearish, percentage };
  };

  const getRecommendationBadge = (percentage: number) => {
    if (percentage >= 70) return <Badge className="bg-green-600">Strong Buy</Badge>;
    if (percentage >= 55) return <Badge className="bg-green-500">Buy</Badge>;
    if (percentage >= 45) return <Badge className="bg-yellow-500">Hold</Badge>;
    if (percentage >= 30) return <Badge className="bg-orange-500">Sell</Badge>;
    return <Badge className="bg-red-600">Strong Sell</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 Analyst Recommendations</CardTitle>
        <CardDescription>View analyst buy/sell/hold recommendations for US stocks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mb-4">
          <Input
            placeholder="Enter stock symbol (e.g., TSLA)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
            className="uppercase"
          />
          <div className="flex justify-center">
            <Button onClick={fetchRecommendations} disabled={loading}>
              {loading ? "Loading..." : "Get Recommendations"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 mb-4">
            {error}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.slice(0, 3).map((rec) => {
                const score = getRecommendationScore(rec);
                return (
                  <Card key={rec.period} className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {new Date(rec.period).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </CardTitle>
                      <div className="text-2xl font-bold">
                        {score.percentage.toFixed(0)}% Bullish
                      </div>
                    </CardHeader>
                    <CardContent>
                      {getRecommendationBadge(score.percentage)}
                      <div className="mt-3 text-sm text-muted-foreground">
                        {score.total} analysts
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Strong Buy</TableHead>
                    <TableHead className="text-right">Buy</TableHead>
                    <TableHead className="text-right">Hold</TableHead>
                    <TableHead className="text-right">Sell</TableHead>
                    <TableHead className="text-right">Strong Sell</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Sentiment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendations.map((rec) => {
                    const score = getRecommendationScore(rec);
                    return (
                      <TableRow key={rec.period}>
                        <TableCell className="font-medium">
                          {new Date(rec.period).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {rec.strongBuy}
                        </TableCell>
                        <TableCell className="text-right text-green-500">{rec.buy}</TableCell>
                        <TableCell className="text-right text-yellow-600">{rec.hold}</TableCell>
                        <TableCell className="text-right text-orange-500">{rec.sell}</TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {rec.strongSell}
                        </TableCell>
                        <TableCell className="text-right font-medium">{score.total}</TableCell>
                        <TableCell>{getRecommendationBadge(score.percentage)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-2xl">💡</span>
                <div className="text-sm space-y-1">
                  <p className="font-medium">Understanding Analyst Recommendations:</p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>
                      • <strong>Strong Buy/Buy:</strong> Analysts expect the stock to outperform
                    </li>
                    <li>
                      • <strong>Hold:</strong> Stock expected to perform in line with the market
                    </li>
                    <li>
                      • <strong>Sell/Strong Sell:</strong> Analysts expect underperformance
                    </li>
                    <li>• Higher bullish % indicates stronger analyst confidence</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
