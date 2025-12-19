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
import { STOCK_WATCHLIST, formatPrice } from "@/lib/constants";
import { isAuthenticated } from "@/lib/auth";
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

  const usStocks = useMemo(() => {
    return STOCK_WATCHLIST.filter((stock) => stock.region === "US");
  }, []);

  const indiaStocks = useMemo(() => {
    return STOCK_WATCHLIST.filter((stock) => stock.region === "INDIA");
  }, []);

  const filteredUsStocks = useMemo(() => {
    return filterAndSortStocks(usStocks);
  }, [usStocks, searchQuery, sortField, sortDirection]);

  const filteredIndiaStocks = useMemo(() => {
    return filterAndSortStocks(indiaStocks);
  }, [indiaStocks, searchQuery, sortField, sortDirection]);

  const calculateVolatilityStops = async () => {
    setIsCalculating(true);
    toast({
      title: "Calculating Volatility Stops",
      description: `Processing ${STOCK_WATCHLIST.length} stocks...`,
    });

    try {
      const stocksToProcess = STOCK_WATCHLIST.map((stock) => ({
        symbol: stock.symbol,
        atrPeriod: stock.atrPeriod || 14,
        atrMultiplier: stock.atrMultiplier || 2.0,
      }));

      const response = await fetch("/api/stock/volatility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stocks: stocksToProcess }),
      });

      const data = await response.json();

      if (data.success) {
        const newVolatilityData = new Map<string, VolatilityData>();
        data.results.forEach((result: any) => {
          if (result.success) {
            newVolatilityData.set(result.symbol, result);
          }
        });
        setVolatilityData(newVolatilityData);
        setLastRun(new Date().toLocaleString());
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
                  <CardDescription className="text-xs">Real-time hours</CardDescription>
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
                    <CardDescription className="text-xs">Monitored securities</CardDescription>
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
                      {usStocks.length}
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
                      {indiaStocks.length}
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
                  <CardDescription className="text-xs">Monitor & calculate</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {/* Status Section */}
              <div className="p-2 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Badge
                    variant={isCalculating || isRunning ? "default" : "secondary"}
                    className={`text-xs px-2 py-0.5 ${isCalculating || isRunning ? "bg-green-500 animate-pulse" : ""}`}
                  >
                    {isCalculating || isRunning ? "⚡ Processing" : "💤 Idle"}
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
                    ✓ {volatilityData.size} calculated
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5">
                <Button
                  onClick={calculateVolatilityStops}
                  disabled={isCalculating || isRunning}
                  size="sm"
                  className="w-full font-semibold text-xs h-9"
                  variant="default"
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  {isCalculating ? "Calculating..." : "Calculate Stops"}
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
                <p className="text-xs text-muted-foreground text-center pt-0.5">
                  Monitor all {STOCK_WATCHLIST.length} stocks
                </p>
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
            <CardTitle>🇺🇸 US Stock Watchlist</CardTitle>
            <CardDescription>
              US stocks being monitored for volatility stops ({filteredUsStocks.length} of{" "}
              {usStocks.length})
            </CardDescription>
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
                      Symbol {getSortIcon("symbol")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("name")}
                    >
                      Name {getSortIcon("name")}
                    </TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Volatility Stop</TableHead>
                    <TableHead className="text-right">Distance %</TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("atrPeriod")}
                    >
                      ATR Period {getSortIcon("atrPeriod")}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("atrMultiplier")}
                    >
                      Multiplier {getSortIcon("atrMultiplier")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsStocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {searchQuery
                          ? `No US stocks found matching "${searchQuery}"`
                          : "No US stocks in watchlist"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsStocks.map((stock) => {
                      const vData = volatilityData.get(stock.symbol);
                      return (
                        <TableRow key={stock.symbol}>
                          <TableCell className="font-bold">{stock.symbol}</TableCell>
                          <TableCell>{stock.name}</TableCell>
                          <TableCell className="text-right">
                            {vData ? (
                              <span className="font-semibold">
                                {formatPrice(vData.currentPrice, stock.symbol)}
                              </span>
                            ) : isCalculating ? (
                              <span className="text-xs text-muted-foreground">Loading...</span>
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
                              <span className="text-muted-foreground">—</span>
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
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{stock.atrPeriod || 14}</TableCell>
                          <TableCell className="text-right">
                            {stock.atrMultiplier || 2.0}x
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
            <CardTitle>🇮🇳 India Stock Watchlist</CardTitle>
            <CardDescription>
              Indian stocks being monitored for volatility stops ({filteredIndiaStocks.length} of{" "}
              {indiaStocks.length})
            </CardDescription>
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
                      Symbol {getSortIcon("symbol")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("name")}
                    >
                      Name {getSortIcon("name")}
                    </TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Volatility Stop</TableHead>
                    <TableHead className="text-right">Distance %</TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("atrPeriod")}
                    >
                      ATR Period {getSortIcon("atrPeriod")}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("atrMultiplier")}
                    >
                      Multiplier {getSortIcon("atrMultiplier")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndiaStocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {searchQuery
                          ? `No Indian stocks found matching "${searchQuery}"`
                          : "No Indian stocks in watchlist"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIndiaStocks.map((stock) => {
                      const vData = volatilityData.get(stock.symbol);
                      return (
                        <TableRow key={stock.symbol}>
                          <TableCell className="font-bold">{stock.symbol}</TableCell>
                          <TableCell>{stock.name}</TableCell>
                          <TableCell className="text-right">
                            {vData ? (
                              <span className="font-semibold">
                                {formatPrice(vData.currentPrice, stock.symbol)}
                              </span>
                            ) : isCalculating ? (
                              <span className="text-xs text-muted-foreground">Loading...</span>
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
                              <span className="text-muted-foreground">—</span>
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
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{stock.atrPeriod || 14}</TableCell>
                          <TableCell className="text-right">
                            {stock.atrMultiplier || 2.0}x
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
