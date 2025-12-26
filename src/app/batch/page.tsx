"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated, getCurrentUser, WatchlistItem } from "@/lib/auth";
import { DMAAnalysisAkshat } from "@/lib/dmaAkshat";
import { StockTable } from "@/components/stock-table";
import { Search, TrendingUp, List, Activity, Clock } from "lucide-react";

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
  const [userStocks, setUserStocks] = useState<WatchlistItem[]>([]);
  const { toast } = useToast();

  // Get user stocks from localStorage
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      const allStocks = [...(user.usStocks || []), ...(user.indiaStocks || [])];
      setUserStocks(allStocks);
    }
  }, []);

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
    if (userStocks.length === 0) return;

    const fetchStockPrices = async () => {
      const newPrices = new Map<string, StockPriceData>();

      try {
        const response = await fetch("/api/stock/price/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stocks: userStocks.map((stock: WatchlistItem) => ({
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
  }, [userStocks]);

  // Fetch analyst recommendations on page load
  useEffect(() => {
    if (userStocks.length === 0) return;

    const fetchRecommendations = async () => {
      const newRecommendations = new Map<string, Recommendation>();

      // Only fetch for US stocks (Finnhub supports US stocks)
      const usStocks = userStocks.filter((stock: WatchlistItem) => stock.region === "US");

      if (usStocks.length > 0) {
        try {
          const response = await fetch("/api/stock/recommendations/batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              stocks: usStocks.map((stock: WatchlistItem) => ({
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
  }, [userStocks]);

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

  const filterAndSortStocks = (stocks: WatchlistItem[]) => {
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
    return filterAndSortStocks(userStocks.filter((stock: WatchlistItem) => stock.region === "US"));
  }, [userStocks, searchQuery, sortField, sortDirection]);

  const filteredIndiaStocks = useMemo(() => {
    return filterAndSortStocks(
      userStocks.filter((stock: WatchlistItem) => stock.region === "INDIA")
    );
  }, [userStocks, searchQuery, sortField, sortDirection]);

  const calculateVolatilityStops = async () => {
    setIsCalculating(true);
    toast({
      title: "Calculating Volatility Stops",
      description: `Processing ${userStocks.length} stocks...`,
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

      const stocksToProcess = userStocks.map((stock: WatchlistItem) => ({
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
        fetchRecommendations(userStocks.filter((s: WatchlistItem) => s.region === "US"));

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

  const fetchRecommendations = async (stocks: WatchlistItem[]) => {
    const newRecs = new Map<string, Recommendation>();

    // Only fetch for US stocks (Finnhub supports US stocks)
    const usStocks = stocks.filter((stock: WatchlistItem) => stock.region === "US");

    if (usStocks.length > 0) {
      try {
        const response = await fetch("/api/stock/recommendations/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stocks: usStocks.map((stock: WatchlistItem) => ({
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
      description: `Analyzing ${userStocks.length} stocks...`,
    });

    try {
      const response = await fetch("/api/stock/dma/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stocks: userStocks.map((stock: WatchlistItem) => ({
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
                    {userStocks.length}
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
                      <span className="text-xs font-semibold">US Market</span>
                    </div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {userStocks.filter((s: WatchlistItem) => s.region === "US").length}
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-md border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">India Market</span>
                    </div>
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {userStocks.filter((s: WatchlistItem) => s.region === "INDIA").length}
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
                  Monitor all {userStocks.length} stocks
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
            <CardTitle>US Stocks</CardTitle>
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
            <StockTable
              stocks={filteredUsStocks}
              region="US"
              stockPrices={stockPrices}
              volatilityData={volatilityData}
              dmaData={dmaData}
              recommendations={recommendations}
              isLoadingDMA={isLoadingDMA}
              searchQuery={searchQuery}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>India Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <StockTable
              stocks={filteredIndiaStocks}
              region="IN"
              stockPrices={stockPrices}
              volatilityData={volatilityData}
              dmaData={dmaData}
              isLoadingDMA={isLoadingDMA}
              searchQuery={searchQuery}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
