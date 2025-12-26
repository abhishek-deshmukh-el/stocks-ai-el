"use client";

import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, WatchlistStock } from "@/lib/constants";
import {
  DMAAnalysisAkshat,
  getSignalDescriptionAkshat,
  getSignalColorClassAkshat,
} from "@/lib/dmaAkshat";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface StockPriceData {
  price: number;
  fetchedAt: Date;
}

interface Recommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

interface VolatilityData {
  symbol: string;
  currentPrice: number;
  atr: number;
  volatilityStop: {
    stopLoss: number;
    stopLossPercentage: number;
    atr: number;
    recommendation: string;
  };
  calculatedAt?: string;
}

type SortField =
  | "symbol"
  | "name"
  | "targetPrice"
  | "atrPeriod"
  | "atrMultiplier"
  | "currentPrice"
  | "stopLoss";
type SortDirection = "asc" | "desc" | null;

interface StockTableProps {
  stocks: WatchlistStock[];
  region: "US" | "IN";
  stockPrices: Map<string, StockPriceData>;
  volatilityData: Map<string, VolatilityData>;
  dmaData: Map<string, DMAAnalysisAkshat>;
  recommendations?: Map<string, Recommendation>;
  isLoadingDMA: boolean;
  searchQuery: string;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export function StockTable({
  stocks,
  region,
  stockPrices,
  volatilityData,
  dmaData,
  recommendations,
  isLoadingDMA,
  searchQuery,
  sortField,
  sortDirection,
  onSort,
}: StockTableProps) {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-4 h-4 ml-1 inline" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="w-4 h-4 ml-1 inline" />;
    }
    return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
  };

  const getRecommendationBadge = (rec: Recommendation) => {
    const total = rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
    const bullish = rec.strongBuy + rec.buy;
    const percentage = (bullish / total) * 100;
    const period = new Date(rec.period).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    let badgeClass = "";
    let badgeText = "";

    if (percentage >= 70) {
      badgeClass = "bg-green-600 text-white";
      badgeText = "Strong Buy";
    } else if (percentage >= 55) {
      badgeClass = "bg-green-500 text-white";
      badgeText = "Buy";
    } else if (percentage >= 45) {
      badgeClass = "bg-yellow-500 text-black";
      badgeText = "Hold";
    } else if (percentage >= 30) {
      badgeClass = "bg-orange-500 text-white";
      badgeText = "Sell";
    } else {
      badgeClass = "bg-red-600 text-white";
      badgeText = "Strong Sell";
    }

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <Badge className={`${badgeClass} cursor-help`}>{badgeText}</Badge>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{period} Analyst Recommendations</h4>
            <div className="text-xs text-muted-foreground">
              {total} analysts covering this stock
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-600"></span>
                  Strong Buy
                </span>
                <span className="font-semibold">{rec.strongBuy}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Buy
                </span>
                <span className="font-semibold">{rec.buy}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  Hold
                </span>
                <span className="font-semibold">{rec.hold}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  Sell
                </span>
                <span className="font-semibold">{rec.sell}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600"></span>
                  Strong Sell
                </span>
                <span className="font-semibold">{rec.strongSell}</span>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Bullish Sentiment</span>
                <span className="font-bold text-lg">{percentage.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const emptyMessage =
    stocks.length === 0
      ? searchQuery
        ? `No ${region === "US" ? "US" : "Indian"} stocks found matching "${searchQuery}"`
        : `No ${region === "US" ? "US" : "Indian"} stocks in watchlist`
      : null;

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer hover:bg-muted" onClick={() => onSort("symbol")}>
              Stock {getSortIcon("symbol")}
            </TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-center">DMAs</TableHead>
            <TableHead className="text-center">Trend</TableHead>
            <TableHead className="text-center">DMA Signal</TableHead>
            <TableHead className="text-right">Volatility Stop</TableHead>
            <TableHead className="text-right">Distance %</TableHead>
            {region === "US" && recommendations && <TableHead>Analyst Rating</TableHead>}
            <TableHead>Recommendation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emptyMessage ? (
            <TableRow>
              <TableCell
                colSpan={region === "US" && recommendations ? 9 : 8}
                className="text-center text-muted-foreground py-8"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            stocks.map((stock) => {
              const vData = volatilityData.get(stock.symbol);
              const dma = dmaData.get(stock.symbol);
              return (
                <TableRow key={stock.symbol}>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <span className="font-bold whitespace-nowrap">{stock.symbol}</span>
                      <span className="text-muted-foreground">-</span>
                      <span
                        className="text-sm text-muted-foreground truncate max-w-[150px]"
                        title={stock.name}
                      >
                        {stock.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {stockPrices.has(stock.symbol) ? (
                      <span className="font-semibold">
                        {formatPrice(stockPrices.get(stock.symbol)!.price, stock.symbol)}
                      </span>
                    ) : vData ? (
                      <span className="font-semibold">
                        {formatPrice(vData.currentPrice, stock.symbol)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Loading...</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {dma ? (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Badge variant="outline" className="cursor-help">
                            View DMAs
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Moving Averages</h4>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">50 DMA:</span>
                                <span className="font-semibold">
                                  {formatPrice(dma.dma50, stock.symbol)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">150 DMA:</span>
                                <span className="font-semibold">
                                  {formatPrice(dma.dma150, stock.symbol)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">200 DMA:</span>
                                <span className="font-semibold">
                                  {formatPrice(dma.dma200, stock.symbol)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : isLoadingDMA ? (
                      <span className="text-xs text-muted-foreground">...</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {dma ? (
                      <Badge
                        className={
                          dma.trendState === "BULLISH"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : dma.trendState === "BEARISH"
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-gray-500 text-white hover:bg-gray-600"
                        }
                      >
                        {dma.trendState}
                      </Badge>
                    ) : isLoadingDMA ? (
                      <span className="text-xs text-muted-foreground">...</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {dma ? (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Badge
                            variant="outline"
                            className={`${getSignalColorClassAkshat(dma.signal)} text-white cursor-help border-0`}
                          >
                            {getSignalDescriptionAkshat(dma.signal)}
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{dma.recommendation}</h4>
                            <div className="text-xs text-muted-foreground">
                              Akshat&apos;s Swing Strategy
                            </div>
                            <div className="space-y-1 pt-2 text-xs">
                              {dma.details.map((detail, idx) => (
                                <div key={idx}>{detail}</div>
                              ))}
                            </div>
                            <div className="pt-2 mt-2 border-t text-xs">
                              <div>From 50 DMA: {dma.distanceFrom50DMAPercent.toFixed(1)}%</div>
                              <div>From 150 DMA: {dma.distanceFrom150DMAPercent.toFixed(1)}%</div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : isLoadingDMA ? (
                      <span className="text-xs text-muted-foreground">...</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {vData ? (
                      <span className="text-red-600 font-semibold">
                        {formatPrice(vData.volatilityStop.stopLoss, stock.symbol)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-center block">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {vData ? (
                      <Badge
                        variant={
                          vData.volatilityStop.stopLossPercentage > 10
                            ? "default"
                            : vData.volatilityStop.stopLossPercentage > 5
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {vData.volatilityStop.stopLossPercentage.toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-center block">—</span>
                    )}
                  </TableCell>
                  {region === "US" && recommendations && (
                    <TableCell>
                      {recommendations.has(stock.symbol) ? (
                        getRecommendationBadge(recommendations.get(stock.symbol)!)
                      ) : (
                        <span className="text-xs text-muted-foreground text-center block">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {vData ? (
                      <Badge
                        className={
                          vData.volatilityStop.recommendation === "SELL"
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }
                      >
                        {vData.volatilityStop.recommendation}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-center block">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
