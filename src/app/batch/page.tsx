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
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";

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
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        // Handle undefined values
        if (aValue === undefined) aValue = 0;
        if (bValue === undefined) bValue = 0;

        // String comparison
        if (typeof aValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Number comparison
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
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

  const runBatchJob = async () => {
    setIsRunning(true);
    toast({
      title: "Starting Batch Job",
      description: `Processing ${STOCK_WATCHLIST.length} stocks...`,
    });

    try {
      const response = await fetch("/api/batch/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ manual: true }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.status);
        setLastRun(new Date().toLocaleString());
        toast({
          title: "Batch Job Complete! 🎉",
          description: `Processed ${data.status.stocksProcessed} stocks, sent ${data.status.alertsSent} alerts`,
        });
      } else {
        throw new Error(data.error || "Batch job failed");
      }
    } catch (error) {
      toast({
        title: "Batch Job Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Automated Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time stock volatility monitoring with automatic API data fetching
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Status</CardTitle>
              <CardDescription>US &amp; India Markets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">🇺🇸 US</span>
                  <Badge
                    variant={marketStatus?.us?.isOpen ? "default" : "secondary"}
                    className="text-sm px-3 py-1"
                  >
                    {marketStatus?.us?.isOpen ? "🟢 Open" : "🔴 Closed"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">🇮🇳 India</span>
                  <Badge
                    variant={marketStatus?.india?.isOpen ? "default" : "secondary"}
                    className="text-sm px-3 py-1"
                  >
                    {marketStatus?.india?.isOpen ? "🟢 Open" : "🔴 Closed"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Watchlist</CardTitle>
              <CardDescription>Stocks being monitored</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{STOCK_WATCHLIST.length}</div>
              <p className="text-sm text-muted-foreground mt-2">Active stocks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Calculate volatility stops and send alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge
                  variant={isCalculating || isRunning ? "default" : "secondary"}
                  className="text-lg px-4 py-2"
                >
                  {isCalculating || isRunning ? "Processing..." : "Idle"}
                </Badge>
                {lastRun && (
                  <p className="text-xs text-muted-foreground mt-3">Last run: {lastRun}</p>
                )}
                {volatilityData.size > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ {volatilityData.size} stocks calculated
                  </p>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  onClick={calculateVolatilityStops}
                  disabled={isCalculating || isRunning}
                  size="lg"
                  className="w-full"
                  variant="default"
                >
                  {isCalculating ? "Calculating..." : "Calculate Volatility Stops"}
                </Button>
                <Button
                  onClick={runBatchJob}
                  disabled={isRunning || isCalculating}
                  size="lg"
                  className="w-full"
                  variant="outline"
                >
                  {isRunning ? "Processing..." : "Run Full Batch Job"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Calculate stops for all {STOCK_WATCHLIST.length} stocks or run full monitoring
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
