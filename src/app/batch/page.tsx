"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { STOCK_WATCHLIST, formatPrice, type WatchlistStock } from "@/lib/constants";
import { isAuthenticated, getCurrentUser, logout } from "@/lib/auth";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";

type SortField = 'symbol' | 'name' | 'targetPrice' | 'atrPeriod' | 'atrMultiplier';
type SortDirection = 'asc' | 'desc' | null;

export default function BatchJobPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [marketStatus, setMarketStatus] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const indianStocks = STOCK_WATCHLIST.filter((stock) => stock.region === "INDIA");
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const user = getCurrentUser();
    if (user) {
      setUserName(user.name);
    }
    
    // Fetch market status from API
    const updateMarketStatus = async () => {
      try {
        const response = await fetch('/api/market/status');
        const data = await response.json();
        if (data.success) {
          setMarketStatus(data.markets);
        }
      } catch (error) {
        console.error('Failed to fetch market status:', error);
      }
    };
    
    updateMarketStatus();
    // Refresh market status every minute
    const interval = setInterval(updateMarketStatus, 60000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-1 inline" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4 ml-1 inline" />;
    }
    return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
  };

  const filteredAndSortedStocks = useMemo(() => {
    let filtered = STOCK_WATCHLIST;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query) ||
          stock.name.toLowerCase().includes(query)
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
        if (typeof aValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Number comparison
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }

    return filtered;
  }, [searchQuery, sortField, sortDirection]);

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
        {/* Header with Logout */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Home</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

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
                  <span className="text-sm font-medium">🇺🇸 US (NYSE/NASDAQ)</span>
                  <Badge variant={marketStatus?.us?.isOpen ? "default" : "secondary"} className="text-sm px-3 py-1">
                    {marketStatus?.us?.isOpen ? "🟢 Open" : "🔴 Closed"}
                  </Badge>
                </div>
                {marketStatus?.us?.holiday && (
                  <p className="text-xs text-muted-foreground ml-6">Holiday: {marketStatus.us.holiday}</p>
                )}
                {marketStatus?.us?.session && marketStatus?.us?.isOpen && (
                  <p className="text-xs text-muted-foreground ml-6">Session: {marketStatus.us.session}</p>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">🇮🇳 India (NSE/BSE)</span>
                  <Badge variant={marketStatus?.india?.isOpen ? "default" : "secondary"} className="text-sm px-3 py-1">
                    {marketStatus?.india?.isOpen ? "🟢 Open" : "🔴 Closed"}
                  </Badge>
                </div>
                {marketStatus?.india?.holiday && (
                  <p className="text-xs text-muted-foreground ml-6">Holiday: {marketStatus.india.holiday}</p>
                )}
                {marketStatus?.india?.session && marketStatus?.india?.isOpen && (
                  <p className="text-xs text-muted-foreground ml-6">Session: {marketStatus.india.session}</p>
                )}
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
              <p className="text-sm text-muted-foreground mt-2">
                Active stocks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batch Status</CardTitle>
              <CardDescription>Trigger and monitor batch jobs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge variant={isRunning ? "default" : "secondary"} className="text-lg px-4 py-2">
                  {isRunning ? "Running..." : "Idle"}
                </Badge>
                {lastRun && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last run: {lastRun}
                  </p>
                )}
              </div>
              
              <div className="pt-2 border-t">
                <Button 
                  onClick={runBatchJob} 
                  disabled={isRunning}
                  size="lg"
                  className="w-full"
                >
                  {isRunning ? "Processing..." : "Run Batch Job Now"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Fetches prices and calculates volatility for all {STOCK_WATCHLIST.length} stocks
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
                      <li key={index} className="text-red-600 dark:text-red-400">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Stock Watchlist</CardTitle>
            <CardDescription>
              Stocks being monitored for volatility stops ({filteredAndSortedStocks.length} of {STOCK_WATCHLIST.length})
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
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol {getSortIcon('symbol')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('name')}
                    >
                      Name {getSortIcon('name')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('targetPrice')}
                    >
                      Target Price {getSortIcon('targetPrice')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('atrPeriod')}
                    >
                      ATR Period {getSortIcon('atrPeriod')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('atrMultiplier')}
                    >
                      Multiplier {getSortIcon('atrMultiplier')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedStocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No stocks found matching &quot;{searchQuery}&quot;
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedStocks.map((stock) => (
                      <TableRow key={stock.symbol}>
                        <TableCell className="font-bold">{stock.symbol}</TableCell>
                        <TableCell>{stock.name}</TableCell>
                        <TableCell className="text-right">
                          {stock.targetPrice ? formatPrice(stock.targetPrice, stock.symbol) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.atrPeriod || 14}
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.atrMultiplier || 2.0}x
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle>Indian Stock Watchlist</CardTitle>
            <CardDescription>
              India-focused symbols monitored for volatility stops
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Target Price</TableHead>
                    <TableHead className="text-right">ATR Period</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indianStocks.map((stock) => (
                    <TableRow key={stock.symbol}>
                      <TableCell className="font-bold">{stock.symbol}</TableCell>
                      <TableCell>{stock.name}</TableCell>
                      <TableCell className="text-right">
                        {stock.targetPrice ? formatPrice(stock.targetPrice, stock.symbol) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {stock.atrPeriod || 14}
                      </TableCell>
                      <TableCell className="text-right">
                        {stock.atrMultiplier || 2.0}x
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
