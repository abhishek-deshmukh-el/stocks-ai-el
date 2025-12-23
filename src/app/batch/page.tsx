"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { STOCK_WATCHLIST, US_STOCKS, INDIA_STOCKS, formatPrice } from "@/lib/constants";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import {
  DMAAnalysisAkshat,
  getSignalDescriptionAkshat,
  getSignalColorClassAkshat,
} from "@/lib/dmaAkshat";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  TrendingUp,
  List,
  Activity,
  Play,
  Clock,
} from "lucide-react";

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

type SortField =
  | "symbol"
  | "name"
  | "targetPrice"
  | "atrPeriod"
  | "atrMultiplier"
  | "currentPrice"
  | "stopLoss";
type SortDirection = "asc" | "desc" | null;

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

export default function BatchJobPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [marketStatus, setMarketStatus] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [volatilityData, setVolatilityData] = useState<Map<string, VolatilityData>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);
  const [stockPrices, setStockPrices] = useState<Map<string, StockPriceData>>(new Map());
  const [recommendations, setRecommendations] = useState<Map<string, Recommendation>>(new Map());
  const [dmaData, setDmaData] = useState<Map<string, DMAAnalysisAkshat>>(new Map());
  const [isLoadingDMA, setIsLoadingDMA] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Fetch market status from API
    const updateMarketStatus = async () => {
      try {
        const response = await fetch("/api/market/status");
        const data = await response.json();
        if (data.success) {
          setMarketStatus(data.markets);
        }
      } catch (error) {
        console.error("Failed to fetch market status:", error);
      }
    };

    updateMarketStatus();
    // Refresh market status every 5 minutes
    const interval = setInterval(updateMarketStatus, 300000);
    return () => clearInterval(interval);
  }, [router]);

  // Fetch stock prices on page load
  useEffect(() => {
    const fetchStockPrices = async () => {
      const newPrices = new Map<string, StockPriceData>();

      try {
        const response = await fetch("/api/stock/price/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stocks: STOCK_WATCHLIST.map((stock) => ({
              symbol: stock.symbol,
              region: stock.region,
            })),
          }),
        });

        const data = await response.json();

        if (data.success) {
          data.results.forEach((result: any) => {
            if (result.success) {
              newPrices.set(result.symbol, {
                price: result.price,
                fetchedAt: new Date(result.fetchedAt),
              });
            }
          });
        }
      } catch (error) {
        console.error("Failed to fetch batch prices:", error);
      }

      setStockPrices(newPrices);
    };

    fetchStockPrices();
  }, []);

  // Fetch analyst recommendations on page load
  useEffect(() => {
    const fetchRecommendations = async () => {
      const newRecommendations = new Map<string, Recommendation>();

      // Only fetch for US stocks (Finnhub supports US stocks)
      const usStocks = STOCK_WATCHLIST.filter((stock) => stock.region === "US");

      if (usStocks.length > 0) {
        try {
          const response = await fetch("/api/stock/recommendations/batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              stocks: usStocks.map((stock) => ({
                symbol: stock.symbol,
                region: stock.region,
              })),
            }),
          });

          const data = await response.json();

          if (data.success) {
            data.results.forEach((result: any) => {
              if (result.success && result.recommendations && result.recommendations.length > 0) {
                // Use the most recent recommendation (first item)
                newRecommendations.set(result.symbol, result.recommendations[0]);
              }
            });
          }
        } catch (error) {
          console.error("Failed to fetch batch recommendations:", error);
        }
      }

      setRecommendations(newRecommendations);
    };

    fetchRecommendations();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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

  const filterAndSortStocks = (stocks: typeof STOCK_WATCHLIST) => {
    let filtered = stocks;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query) || stock.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        // Get values based on sortField
        switch (sortField) {
          case "symbol":
          case "name":
            aValue = a[sortField];
            bValue = b[sortField];
            break;
          case "targetPrice":
          case "atrPeriod":
          case "atrMultiplier":
            aValue = a[sortField] ?? 0;
            bValue = b[sortField] ?? 0;
            break;
          case "currentPrice":
          case "stopLoss":
            aValue = 0;
            bValue = 0;
            break;
          default:
            aValue = 0;
            bValue = 0;
        }

        // Handle undefined values
        if (aValue === undefined) aValue = 0;
        if (bValue === undefined) bValue = 0;

        // String comparison
        if (typeof aValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue as string)
            : (bValue as string).localeCompare(aValue);
        }

        // Number comparison
        return sortDirection === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
    }

    return filtered;
  };

  const filteredUsStocks = useMemo(() => {
    return filterAndSortStocks(US_STOCKS);
  }, [US_STOCKS, searchQuery, sortField, sortDirection]);

  const filteredIndiaStocks = useMemo(() => {
    return filterAndSortStocks(INDIA_STOCKS);
  }, [INDIA_STOCKS, searchQuery, sortField, sortDirection]);

  const calculateVolatilityStops = async () => {
    setIsCalculating(true);
    toast({
      title: "Calculating Volatility Stops",
      description: `Processing ${STOCK_WATCHLIST.length} stocks...`,
    });

    try {
      const user = getCurrentUser();
      if (!user?.phoneNumber) {
        toast({
          title: "Error",
          description: "User phone number not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      const stocksToProcess = STOCK_WATCHLIST.map((stock) => ({
        symbol: stock.symbol,
        region: stock.region,
        atrPeriod: stock.atrPeriod || 14,
        atrMultiplier: stock.atrMultiplier || 2.0,
      }));

      const response = await fetch("/api/stock/volatility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stocks: stocksToProcess,
          phoneNumber: user.phoneNumber,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newVolatilityData = new Map<string, VolatilityData>();
        const newPrices = new Map<string, StockPriceData>();
        data.results.forEach((result: any) => {
          if (result.success) {
            newVolatilityData.set(result.symbol, result);
            // Store price data from volatility calculation
            newPrices.set(result.symbol, {
              price: result.currentPrice,
              fetchedAt: new Date(),
            });
          }
        });
        setVolatilityData(newVolatilityData);
        setStockPrices(newPrices);
        setLastRun(new Date().toLocaleString());

        // Show alert notification if any were sent
        if (data.alertsSent > 0) {
          toast({
            title: "SELL Alerts Sent",
            description: `Sent WhatsApp notifications for ${data.alertsSent} SELL recommendation(s)`,
          });
        }

        // Fetch recommendations for US stocks
        fetchRecommendations(STOCK_WATCHLIST.filter((s) => s.region === "US"));

        toast({
          title: "Volatility Calculation Complete! 🎉",
          description: `Processed ${data.totalSuccessful} of ${data.totalProcessed} stocks`,
        });
      } else {
        throw new Error(data.error || "Volatility calculation failed");
      }
    } catch (error) {
      toast({
        title: "Calculation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const fetchRecommendations = async (stocks: typeof STOCK_WATCHLIST) => {
    const newRecs = new Map<string, Recommendation>();

    // Only fetch for US stocks (Finnhub supports US stocks)
    const usStocks = stocks.filter((stock) => stock.region === "US");

    if (usStocks.length > 0) {
      try {
        const response = await fetch("/api/stock/recommendations/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stocks: usStocks.map((stock) => ({
              symbol: stock.symbol,
              region: stock.region,
            })),
          }),
        });

        const data = await response.json();

        if (data.success) {
          data.results.forEach((result: any) => {
            if (result.success && result.recommendations && result.recommendations.length > 0) {
              // Use the most recent recommendation
              newRecs.set(result.symbol, result.recommendations[0]);
            }
          });
        }
      } catch (error) {
        console.error("Failed to fetch batch recommendations:", error);
      }
    }

    setRecommendations(newRecs);
  };

  const calculateDMASignals = async () => {
    setIsLoadingDMA(true);
    toast({
      title: "Calculating DMA Signals",
      description: `Analyzing ${STOCK_WATCHLIST.length} stocks...`,
    });

    try {
      const response = await fetch("/api/stock/dma/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stocks: STOCK_WATCHLIST.map((stock) => ({
            symbol: stock.symbol,
            region: stock.region,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newDMAData = new Map<string, DMAAnalysisAkshat>();
        data.results.forEach((result: any) => {
          if (result.success && result.analysis) {
            newDMAData.set(result.symbol, result.analysis);
          }
        });
        setDmaData(newDMAData);

        toast({
          title: "DMA Analysis Complete! 🎯",
          description: `Analyzed ${data.totalSuccessful} of ${data.totalProcessed} stocks`,
        });
      } else {
        throw new Error(data.error || "DMA analysis failed");
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDMA(false);
    }
  };

  // const runBatchJob = async () => {
  //   setIsRunning(true);
  //   toast({
  //     title: "Starting Batch Job",
  //     description: `Processing ${STOCK_WATCHLIST.length} stocks...`,
  //   });

  //   try {
  //     const response = await fetch("/api/batch/run", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ manual: true }),
  //     });

  //     const data = await response.json();

  //     if (data.success) {
  //       setResults(data.status);
  //       setLastRun(new Date().toLocaleString());
  //       toast({
  //         title: "Batch Job Complete! 🎉",
  //         description: `Processed ${data.status.stocksProcessed} stocks, sent ${data.status.alertsSent} alerts`,
  //       });
  //     } else {
  //       throw new Error(data.error || "Batch job failed");
  //     }
  //   } catch (error) {
  //     toast({
  //       title: "Batch Job Failed",
  //       description: error instanceof Error ? error.message : "Unknown error",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setIsRunning(false);
  //   }
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Automated Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time stock volatility monitoring with automatic API data fetching
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {/* Market Status Card */}
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-md">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Market Status</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-2">
                <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">🇺🇸</span>
                      <span className="text-xs font-semibold">US Market</span>
                    </div>
                    <Badge
                      variant={marketStatus?.us?.isOpen ? "default" : "secondary"}
                      className={`text-xs px-2 py-0.5 ${marketStatus?.us?.isOpen ? "bg-green-500 hover:bg-green-600" : ""}`}
                    >
                      {marketStatus?.us?.isOpen ? "🟢 LIVE" : "⏸️ Closed"}
                    </Badge>
                  </div>
                </div>

                <div className="p-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 rounded-md border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">🇮🇳</span>
                      <span className="text-xs font-semibold">India Market</span>
                    </div>
                    <Badge
                      variant={marketStatus?.india?.isOpen ? "default" : "secondary"}
                      className={`text-xs px-2 py-0.5 ${marketStatus?.india?.isOpen ? "bg-green-500 hover:bg-green-600" : ""}`}
                    >
                      {marketStatus?.india?.isOpen ? "🟢 LIVE" : "⏸️ Closed"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Watchlist Card */}
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900 rounded-md">
                    <List className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Watchlist</CardTitle>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {STOCK_WATCHLIST.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-2">
                <div className="p-2 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🇺🇸</span>
                      <span className="text-xs font-semibold">US Market</span>
                    </div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {US_STOCKS.length}
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-md border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🇮🇳</span>
                      <span className="text-xs font-semibold">India Market</span>
                    </div>
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {INDIA_STOCKS.length}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-md">
                  <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {/* Status Section */}
              <div className="p-2 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Badge
                    variant={isCalculating || isRunning || isLoadingDMA ? "default" : "secondary"}
                    className={`text-xs px-2 py-0.5 ${isCalculating || isRunning || isLoadingDMA ? "bg-green-500 animate-pulse" : ""}`}
                  >
                    {isCalculating || isRunning || isLoadingDMA ? "⚡ Processing" : "💤 Idle"}
                  </Badge>
                </div>
                {lastRun && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Last: {lastRun}</span>
                  </div>
                )}
                {volatilityData.size > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 font-medium">
                    ✓ {volatilityData.size} stops calculated
                  </p>
                )}
                {dmaData.size > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    ✓ {dmaData.size} DMA signals
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5">
                <Button
                  onClick={calculateVolatilityStops}
                  disabled={isCalculating || isRunning || isLoadingDMA}
                  size="sm"
                  className="w-full font-semibold text-xs h-9"
                  variant="default"
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  {isCalculating ? "Calculating..." : "Calculate Stops"}
                </Button>
                <Button
                  onClick={calculateDMASignals}
                  disabled={isCalculating || isRunning || isLoadingDMA}
                  size="sm"
                  className="w-full font-semibold text-xs h-9"
                  variant="outline"
                >
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  {isLoadingDMA ? "Analyzing..." : "Calculate DMA"}
                </Button>
                {/* <Button
                  onClick={runBatchJob}
                  disabled={isRunning || isCalculating}
                  size="sm"
                  className="w-full font-semibold text-xs h-9"
                  variant="outline"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  {isRunning ? "Running..." : "Run Batch Job"}
                </Button> */}
                {/* <p className="text-xs text-muted-foreground text-center pt-0.5">
                  Monitor all {STOCK_WATCHLIST.length} stocks
                </p> */}
              </div>
            </CardContent>
          </Card>
        </div>

        {results && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Last Run Results</CardTitle>
              <CardDescription>Batch job execution summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-muted p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold">{results.stocksProcessed}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </div>
                <div className="bg-muted p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{results.alertsSent}</div>
                  <div className="text-sm text-muted-foreground">Alerts Sent</div>
                </div>
                <div className="bg-muted p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Errors:</h4>
                  <ul className="text-sm space-y-1">
                    {results.errors.map((error: string, index: number) => (
                      <li key={index} className="text-red-600 dark:text-red-400">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>🇺🇸 US Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("symbol")}
                    >
                      Stock {getSortIcon("symbol")}
                    </TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-center">DMAs</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-center">DMA Signal</TableHead>
                    <TableHead className="text-right">Volatility Stop</TableHead>
                    <TableHead className="text-right">Distance %</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Analyst Rating</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsStocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {searchQuery
                          ? `No US stocks found matching "${searchQuery}"`
                          : "No US stocks in watchlist"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsStocks.map((stock) => {
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
                                      <div>
                                        From 50 DMA: {dma.distanceFrom50DMAPercent.toFixed(1)}%
                                      </div>
                                      <div>
                                        From 150 DMA: {dma.distanceFrom150DMAPercent.toFixed(1)}%
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
                          {/* <TableCell className="text-right">{stock.atrPeriod || 14}</TableCell>
                          <TableCell className="text-right">
                            {stock.atrMultiplier || 2.0}x
                          </TableCell> */}
                          <TableCell>
                            {stockPrices.has(stock.symbol) ? (
                              <div className="text-xs text-muted-foreground">
                                {stockPrices.get(stock.symbol)!.fetchedAt.toLocaleTimeString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-center block">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {recommendations.has(stock.symbol) ? (
                              getRecommendationBadge(recommendations.get(stock.symbol)!)
                            ) : (
                              <span className="text-xs text-muted-foreground text-center block">
                                —
                              </span>
                            )}
                          </TableCell>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🇮🇳 India Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("symbol")}
                    >
                      Stock {getSortIcon("symbol")}
                    </TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-center">DMAs</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-center">DMA Signal</TableHead>
                    <TableHead className="text-right">Volatility Stop</TableHead>
                    <TableHead className="text-right">Distance %</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndiaStocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {searchQuery
                          ? `No Indian stocks found matching "${searchQuery}"`
                          : "No Indian stocks in watchlist"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIndiaStocks.map((stock) => {
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
                                      <div>
                                        From 50 DMA: {dma.distanceFrom50DMAPercent.toFixed(1)}%
                                      </div>
                                      <div>
                                        From 150 DMA: {dma.distanceFrom150DMAPercent.toFixed(1)}%
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
                          {/* <TableCell className="text-right">{stock.atrPeriod || 14}</TableCell>
                          <TableCell className="text-right">
                            {stock.atrMultiplier || 2.0}x
                          </TableCell> */}
                          <TableCell>
                            {stockPrices.has(stock.symbol) ? (
                              <div className="text-xs text-muted-foreground">
                                {stockPrices.get(stock.symbol)!.fetchedAt.toLocaleTimeString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-center block">—</span>
                            )}
                          </TableCell>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
