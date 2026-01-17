"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { Region, type WatchlistStock } from "@/lib/constants";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { Plus, X, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { StockTableView } from "@/components/stock-table-view";

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

type SortField = "symbol" | "name" | "alertPrice" | "atrPeriod" | "atrMultiplier" | "price";
type SortDirection = "asc" | "desc" | null;

export default function WatchlistManagementPage() {
  const router = useRouter();
  const [usStocks, setUsStocks] = useState<WatchlistStock[]>([]);
  const [indiaStocks, setIndiaStocks] = useState<WatchlistStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Map<string, Recommendation>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [addingRegion, setAddingRegion] = useState<Region>(Region.US);
  const [stockPrices, setStockPrices] = useState<Map<string, StockPriceData>>(new Map());
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const { toast } = useToast();

  // Form state for adding new stock
  const [newStock, setNewStock] = useState({
    symbol: "",
    name: "",
    alertPrice: 0,
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: Region.US as Region,
    owned: false,
  });

  // Edit form state
  const [editForm, setEditForm] = useState<WatchlistStock | null>(null);

  const fetchAllPrices = async (stocks: WatchlistStock[]) => {
    if (stocks.length === 0) return;

    setFetchingPrices(true);
    const newPrices = new Map<string, StockPriceData>();

    try {
      const stocksData = stocks.map((s) => ({
        symbol: s.symbol,
        region: s.region,
      }));
      const response = await fetch("/api/stock/price/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stocks: stocksData }),
      });
      const data = await response.json();

      if (data.success && data.results) {
        data.results.forEach((result: any) => {
          if (result.success && result.price) {
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
    setFetchingPrices(false);
  };

  const fetchRecommendations = async (stocks: WatchlistStock[]) => {
    const usStocks = stocks.filter((s) => s.region === Region.US);
    if (usStocks.length === 0) return;

    const newRecs = new Map<string, Recommendation>();

    try {
      const stocksData = usStocks.map((s) => ({ symbol: s.symbol, region: s.region }));
      const response = await fetch("/api/stock/recommendations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stocks: stocksData }),
      });
      const data = await response.json();

      if (data.success && data.results) {
        data.results.forEach((result: any) => {
          if (result.success && result.recommendations.length > 0) {
            // Use the most recent recommendation
            newRecs.set(result.symbol, result.recommendations[0]);
          }
        });
      }
    } catch (error) {
      console.error("Failed to fetch batch recommendations:", error);
    }

    setRecommendations(newRecs);
  };

  const loadWatchlist = useCallback(async () => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const user = getCurrentUser();
    if (!user || !user.id) {
      router.push("/login");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/watchlist?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        const allStocks = data.stocks;
        const usFiltered = allStocks.filter((s: WatchlistStock) => s.region === Region.US);
        const indiaFiltered = allStocks.filter((s: WatchlistStock) => s.region === Region.INDIA);
        setUsStocks(usFiltered);
        setIndiaStocks(indiaFiltered);

        // Fetch prices for all stocks
        fetchAllPrices([...usFiltered, ...indiaFiltered]);

        // Fetch recommendations for US stocks
        fetchRecommendations([...usFiltered, ...indiaFiltered]);
      }
    } catch (error) {
      toast({
        title: "Error Loading Watchlist",
        description: error instanceof Error ? error.message : "Failed to load stocks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const handleAddStock = async () => {
    if (!newStock.symbol || !newStock.name) {
      toast({
        title: "Missing Information",
        description: "Please provide both symbol and name",
        variant: "destructive",
      });
      return;
    }

    const user = getCurrentUser();
    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    const stockToAdd: WatchlistStock = {
      symbol: newStock.symbol.toUpperCase(),
      name: newStock.name,
      alertPrice: newStock.alertPrice || undefined,
      atrPeriod: newStock.atrPeriod,
      atrMultiplier: newStock.atrMultiplier,
      region: newStock.region,
    };

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          stock: stockToAdd,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to add stock");
      }

      if (newStock.region === Region.US) {
        setUsStocks([...usStocks, stockToAdd]);
      } else {
        setIndiaStocks([...indiaStocks, stockToAdd]);
      }

      setNewStock({
        symbol: "",
        name: "",
        alertPrice: 0,
        atrPeriod: 14,
        atrMultiplier: 2.0,
        region: Region.US,
        owned: false,
      });
      setIsAddingNew(false);

      toast({
        title: "Stock Added ✅",
        description: `${stockToAdd.symbol} added to ${newStock.region} watchlist`,
      });
    } catch (error) {
      toast({
        title: "Error Adding Stock",
        description: error instanceof Error ? error.message : "Failed to add stock",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStock = async (symbol: string, region: Region) => {
    const user = getCurrentUser();
    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/watchlist?userId=${user.id}&symbol=${symbol}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete stock");
      }

      if (region === Region.US) {
        setUsStocks(usStocks.filter((s) => s.symbol !== symbol));
      } else {
        setIndiaStocks(indiaStocks.filter((s) => s.symbol !== symbol));
      }

      toast({
        title: "Stock Removed 🗑️",
        description: `${symbol} removed from watchlist`,
      });
    } catch (error) {
      toast({
        title: "Error Deleting Stock",
        description: error instanceof Error ? error.message : "Failed to delete stock",
        variant: "destructive",
      });
    }
  };

  const handleEditStock = (stock: WatchlistStock) => {
    setEditingId(stock.symbol);
    setEditForm({ ...stock });
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingId) return;

    const user = getCurrentUser();
    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Check if symbol changed
    const symbolChanged = editForm.symbol.toUpperCase() !== editingId.toUpperCase();
    const newSymbol = editForm.symbol.toUpperCase();

    // If symbol changed, check for duplicates
    if (symbolChanged) {
      const allStocks = [...usStocks, ...indiaStocks];
      const duplicate = allStocks.find(
        (s) => s.symbol.toUpperCase() === newSymbol && s.symbol !== editingId
      );
      if (duplicate) {
        toast({
          title: "Duplicate Symbol",
          description: `${newSymbol} already exists in your watchlist`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      if (symbolChanged) {
        // Symbol changed: delete old and add new
        // First delete the old one
        const deleteResponse = await fetch(`/api/watchlist?userId=${user.id}&symbol=${editingId}`, {
          method: "DELETE",
        });
        const deleteData = await deleteResponse.json();
        if (!deleteData.success) {
          throw new Error(deleteData.error || "Failed to delete old stock");
        }

        // Then add the new one
        const updatedStock = { ...editForm, symbol: newSymbol };
        const addResponse = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            stock: updatedStock,
          }),
        });
        const addData = await addResponse.json();
        if (!addData.success) {
          throw new Error(addData.error || "Failed to add updated stock");
        }

        // Update local state
        const region = editForm.region;
        if (region === Region.US) {
          setUsStocks(usStocks.map((s) => (s.symbol === editingId ? updatedStock : s)));
        } else {
          setIndiaStocks(indiaStocks.map((s) => (s.symbol === editingId ? updatedStock : s)));
        }
      } else {
        // Symbol unchanged: normal update
        const response = await fetch("/api/watchlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            symbol: editingId,
            stock: editForm,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to update stock");
        }

        const region = editForm.region;
        if (region === Region.US) {
          setUsStocks(usStocks.map((s) => (s.symbol === editingId ? editForm : s)));
        } else {
          setIndiaStocks(indiaStocks.map((s) => (s.symbol === editingId ? editForm : s)));
        }
      }

      setEditingId(null);
      setEditForm(null);

      toast({
        title: "Stock Updated ✅",
        description: `${editForm.symbol} updated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error Updating Stock",
        description: error instanceof Error ? error.message : "Failed to update stock",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

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

  const handleTriggerPriceCheck = async () => {
    const user = getCurrentUser();
    if (!user || !user.phoneNumber) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setCheckingAlerts(true);
    try {
      const response = await fetch("/api/cron/check-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: user.phoneNumber }),
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Price Check Complete",
          description: `Checked ${data.checkedCount} stocks, sent ${data.notificationsSent} notifications`,
        });
      } else {
        throw new Error(data.error || "Failed to check prices");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check prices",
        variant: "destructive",
      });
    } finally {
      setCheckingAlerts(false);
    }
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
        <HoverCardTrigger asChild tabIndex={0}>
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

  const sortStocks = useCallback(
    (stocks: WatchlistStock[]) => {
      if (!sortField || !sortDirection) return stocks;

      return [...stocks].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortField === "price") {
          aValue = stockPrices.get(a.symbol)?.price ?? 0;
          bValue = stockPrices.get(b.symbol)?.price ?? 0;
        } else {
          aValue = a[sortField];
          bValue = b[sortField];
        }

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
    },
    [sortField, sortDirection, stockPrices]
  );

  const sortedUsStocks = useMemo(() => sortStocks(usStocks), [usStocks, sortStocks]);
  const sortedIndiaStocks = useMemo(() => sortStocks(indiaStocks), [indiaStocks, sortStocks]);

  const totalStocks = usStocks.length + indiaStocks.length;
  const totalWithTargets = [...usStocks, ...indiaStocks].filter((s) => s.alertPrice).length;

  const renderStockTable = (stocks: WatchlistStock[], region: Region) => {
    return (
      <StockTableView
        stocks={stocks}
        region={region}
        editingId={editingId}
        editForm={editForm}
        setEditForm={setEditForm}
        handleEditStock={handleEditStock}
        handleDeleteStock={handleDeleteStock}
        stockPrices={stockPrices}
        fetchingPrices={fetchingPrices}
        handleSaveEdit={handleSaveEdit}
        handleCancelEdit={handleCancelEdit}
        setUsStocks={setUsStocks}
        setIndiaStocks={setIndiaStocks}
        toast={toast}
        recommendations={recommendations}
        sortField={sortField}
        sortDirection={sortDirection}
        handleSort={handleSort}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">
              Manage Watchlist
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Add, edit, or remove stocks from your monitoring list
            </p>
          </div>
          <Button
            onClick={handleTriggerPriceCheck}
            disabled={checkingAlerts}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-950"
          >
            {checkingAlerts ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                <span className="text-xs sm:text-sm">Checking...</span>
              </>
            ) : (
              <>
                <span className="mr-2">🔔</span>
                <span className="text-xs sm:text-sm">Trigger Alerts</span>
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Quick Stats - Modern Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 mb-0.5">
                      Total Stocks
                    </p>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {totalStocks}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                    <span className="text-lg">📊</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">
                      US Stocks
                    </p>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {usStocks.length}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                    <span className="text-lg">🇺🇸</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400 mb-0.5">
                      India Stocks
                    </p>
                    <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                      {indiaStocks.length}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                    <span className="text-lg">🇮🇳</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {isAddingNew && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Add New Stock</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure stock monitoring parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="region">Region *</Label>
                    <select
                      id="region"
                      value={newStock.region}
                      onChange={(e) =>
                        setNewStock({ ...newStock, region: e.target.value as Region })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value={Region.US}>🇺🇸 United States</option>
                      <option value={Region.INDIA}>🇮🇳 India</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="symbol">Stock Symbol *</Label>
                    <Input
                      id="symbol"
                      placeholder={newStock.region === Region.US ? "AAPL" : "RELIANCE.NS"}
                      value={newStock.symbol}
                      onChange={(e) =>
                        setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })
                      }
                      className="uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      placeholder="Apple Inc."
                      value={newStock.name}
                      onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="alertPrice">Alert Price (Optional)</Label>
                    <Input
                      id="alertPrice"
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      value={newStock.alertPrice || ""}
                      onChange={(e) =>
                        setNewStock({ ...newStock, alertPrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="atrPeriod">ATR Period</Label>
                    <Input
                      id="atrPeriod"
                      type="number"
                      value={newStock.atrPeriod}
                      onChange={(e) =>
                        setNewStock({ ...newStock, atrPeriod: parseInt(e.target.value) || 14 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="atrMultiplier">ATR Multiplier</Label>
                    <Input
                      id="atrMultiplier"
                      type="number"
                      step="0.1"
                      value={newStock.atrMultiplier}
                      onChange={(e) =>
                        setNewStock({
                          ...newStock,
                          atrMultiplier: parseFloat(e.target.value) || 2.0,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="owned"
                      type="checkbox"
                      checked={newStock.owned}
                      onChange={(e) => setNewStock({ ...newStock, owned: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <Label htmlFor="owned" className="cursor-pointer">
                      I own this stock
                    </Label>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button className="w-full sm:w-auto" onClick={handleAddStock}>
                    <Check className="w-4 h-4 mr-2" />
                    Add Stock
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    variant="outline"
                    onClick={() => setIsAddingNew(false)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* US Stocks Section */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-blue-50 dark:bg-blue-950/20">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  US Stocks
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {usStocks.length} US stock{usStocks.length !== 1 ? "s" : ""} being monitored
                </CardDescription>
              </div>
              {!isAddingNew && (
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setAddingRegion(Region.US);
                    setIsAddingNew(true);
                    setNewStock({ ...newStock, region: Region.US });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="text-xs sm:text-sm">Add US Stock</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                renderStockTable(sortedUsStocks, Region.US)
              )}
            </CardContent>
          </Card>

          {/* India Stocks Section */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-orange-50 dark:bg-orange-950/20">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  India Stocks
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {indiaStocks.length} Indian stock{indiaStocks.length !== 1 ? "s" : ""} being
                  monitored
                </CardDescription>
              </div>
              {!isAddingNew && (
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setAddingRegion(Region.INDIA);
                    setIsAddingNew(true);
                    setNewStock({ ...newStock, region: Region.INDIA });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="text-xs sm:text-sm">Add India Stock</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                renderStockTable(sortedIndiaStocks, Region.INDIA)
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>💡 Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                • <strong>US Stocks:</strong> Use standard symbols (AAPL, MSFT, GOOGL)
              </li>
              <li>
                • <strong>Indian Stocks:</strong> Add .NS suffix for NSE stocks (RELIANCE.NS,
                TCS.NS)
              </li>
              <li>
                • <strong>ATR Period:</strong> Default is 14 days, suitable for most stocks
              </li>
              <li>
                • <strong>ATR Multiplier:</strong> Higher values (2.5-3.0) for volatile stocks,
                lower (1.5-2.0) for stable ones
              </li>
              <li>
                • <strong>Alert Price:</strong> Optional - set if you have a specific exit target
              </li>
              <li>• Changes are saved locally - batch job will use updated settings on next run</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
