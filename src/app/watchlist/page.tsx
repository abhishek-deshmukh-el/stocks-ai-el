"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import {
  US_STOCKS,
  INDIA_STOCKS,
  STOCK_WATCHLIST,
  type WatchlistStock,
  formatPrice,
} from "@/lib/constants";
import { isAuthenticated, getCurrentUser, logout } from "@/lib/auth";
import Link from "next/link";
import { Trash2, Plus, Edit2, X, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

type SortField = "symbol" | "name" | "targetPrice" | "atrPeriod" | "atrMultiplier" | "price";
type SortDirection = "asc" | "desc" | null;

export default function WatchlistManagementPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [usStocks, setUsStocks] = useState<WatchlistStock[]>([]);
  const [indiaStocks, setIndiaStocks] = useState<WatchlistStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Map<string, Recommendation>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [addingRegion, setAddingRegion] = useState<"US" | "INDIA">("US");
  const [stockPrices, setStockPrices] = useState<Map<string, StockPriceData>>(new Map());
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Form state for adding new stock
  const [newStock, setNewStock] = useState({
    symbol: "",
    name: "",
    targetPrice: 0,
    atrPeriod: 14,
    atrMultiplier: 2.0,
    region: "US" as "US" | "INDIA",
  });

  // Edit form state
  const [editForm, setEditForm] = useState<WatchlistStock | null>(null);

  const fetchAllPrices = async (stocks: WatchlistStock[]) => {
    setFetchingPrices(true);
    const newPrices = new Map<string, StockPriceData>();

    for (const stock of stocks) {
      try {
        const response = await fetch(`/api/stock/price?symbol=${encodeURIComponent(stock.symbol)}`);
        const data = await response.json();

        if (data.success && data.price) {
          newPrices.set(stock.symbol, {
            price: data.price,
            fetchedAt: new Date(data.fetchedAt),
          });
        }
      } catch (error) {
        console.error(`Failed to fetch price for ${stock.symbol}:`, error);
      }
    }

    setStockPrices(newPrices);
    setFetchingPrices(false);
  };

  const fetchRecommendations = async (stocks: WatchlistStock[]) => {
    const newRecs = new Map<string, Recommendation>();

    for (const stock of stocks) {
      // Only fetch for US stocks (Finnhub supports US stocks)
      if (stock.region === "US") {
        try {
          const response = await fetch(
            `/api/stock/recommendations?symbol=${encodeURIComponent(stock.symbol)}`
          );
          const data = await response.json();

          if (data.success && data.recommendations.length > 0) {
            // Use the most recent recommendation
            newRecs.set(stock.symbol, data.recommendations[0]);
          }
        } catch (error) {
          console.error(`Failed to fetch recommendations for ${stock.symbol}:`, error);
        }
      }
    }

    setRecommendations(newRecs);
  };

  const loadWatchlist = useCallback(async () => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const user = getCurrentUser();
    if (user) {
      setUserName(user.name);
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/watchlist");
      const data = await response.json();

      if (data.success) {
        const allStocks = data.stocks;
        const usFiltered = allStocks.filter((s: WatchlistStock) => s.region === "US");
        const indiaFiltered = allStocks.filter((s: WatchlistStock) => s.region === "INDIA");
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

  const handleAddStock = () => {
    if (!newStock.symbol || !newStock.name) {
      toast({
        title: "Missing Information",
        description: "Please provide both symbol and name",
        variant: "destructive",
      });
      return;
    }

    const stockToAdd: WatchlistStock = {
      symbol: newStock.symbol.toUpperCase(),
      name: newStock.name,
      targetPrice: newStock.targetPrice || undefined,
      atrPeriod: newStock.atrPeriod,
      atrMultiplier: newStock.atrMultiplier,
      region: newStock.region,
    };

    if (newStock.region === "US") {
      setUsStocks([...usStocks, stockToAdd]);
    } else {
      setIndiaStocks([...indiaStocks, stockToAdd]);
    }

    setNewStock({
      symbol: "",
      name: "",
      targetPrice: 0,
      atrPeriod: 14,
      atrMultiplier: 2.0,
      region: "US",
    });
    setIsAddingNew(false);

    toast({
      title: "Stock Added ✅",
      description: `${stockToAdd.symbol} added to ${newStock.region} watchlist`,
    });
  };

  const handleDeleteStock = (symbol: string, region: "US" | "INDIA") => {
    if (region === "US") {
      setUsStocks(usStocks.filter((s) => s.symbol !== symbol));
    } else {
      setIndiaStocks(indiaStocks.filter((s) => s.symbol !== symbol));
    }
    toast({
      title: "Stock Removed 🗑️",
      description: `${symbol} removed from watchlist`,
    });
  };

  const handleEditStock = (stock: WatchlistStock) => {
    setEditingId(stock.symbol);
    setEditForm({ ...stock });
  };

  const handleSaveEdit = () => {
    if (!editForm) return;

    const region = editForm.region || "US";
    if (region === "US") {
      setUsStocks(usStocks.map((s) => (s.symbol === editingId ? editForm : s)));
    } else {
      setIndiaStocks(indiaStocks.map((s) => (s.symbol === editingId ? editForm : s)));
    }

    setEditingId(null);
    setEditForm(null);

    toast({
      title: "Stock Updated ✅",
      description: `${editForm.symbol} updated successfully`,
    });
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
  const totalWithTargets = [...usStocks, ...indiaStocks].filter((s) => s.targetPrice).length;

  const renderStockTable = (stocks: WatchlistStock[], region: "US" | "INDIA") => {
    if (stocks.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {region} stocks in watchlist. Add your first stock!
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
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
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort("targetPrice")}
              >
                Target Price {getSortIcon("targetPrice")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort("atrPeriod")}
              >
                ATR Period {getSortIcon("atrPeriod")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort("atrMultiplier")}
              >
                ATR Multiplier {getSortIcon("atrMultiplier")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort("price")}
              >
                Current Price {getSortIcon("price")}
              </TableHead>
              <TableHead>Last Updated</TableHead>
              {region === "US" && <TableHead>Analyst Rating</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map((stock) => (
              <TableRow key={stock.symbol}>
                {editingId === stock.symbol && editForm ? (
                  <>
                    <TableCell>
                      <Badge variant="secondary">{stock.symbol}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.targetPrice || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            targetPrice: parseFloat(e.target.value) || undefined,
                          })
                        }
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm.atrPeriod || 14}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            atrPeriod: parseInt(e.target.value) || 14,
                          })
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={editForm.atrMultiplier || 2.0}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            atrMultiplier: parseFloat(e.target.value) || 2.0,
                          })
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      {stockPrices.has(stock.symbol) ? (
                        <div className="text-sm">
                          <div className="font-semibold">
                            {formatPrice(stockPrices.get(stock.symbol)!.price, stock.symbol)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {stockPrices.has(stock.symbol) ? (
                        <div className="text-xs text-muted-foreground">
                          {stockPrices.get(stock.symbol)!.fetchedAt.toLocaleTimeString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {region === "US" && (
                      <TableCell>
                        {recommendations.has(stock.symbol) ? (
                          getRecommendationBadge(recommendations.get(stock.symbol)!)
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="default" onClick={handleSaveEdit}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <Badge variant="secondary">{stock.symbol}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{stock.name}</TableCell>
                    <TableCell>
                      {stock.targetPrice ? formatPrice(stock.targetPrice, stock.symbol) : "-"}
                    </TableCell>
                    <TableCell>{stock.atrPeriod || 14}</TableCell>
                    <TableCell>{(stock.atrMultiplier || 2.0).toFixed(1)}</TableCell>
                    <TableCell>
                      {stockPrices.has(stock.symbol) ? (
                        <div className="text-sm">
                          <div className="font-semibold">
                            {formatPrice(stockPrices.get(stock.symbol)!.price, stock.symbol)}
                          </div>
                        </div>
                      ) : fetchingPrices ? (
                        <span className="text-xs text-muted-foreground">Loading...</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {stockPrices.has(stock.symbol) ? (
                        <div className="text-xs text-muted-foreground">
                          {stockPrices.get(stock.symbol)!.fetchedAt.toLocaleTimeString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {region === "US" && (
                      <TableCell>
                        {recommendations.has(stock.symbol) ? (
                          getRecommendationBadge(recommendations.get(stock.symbol)!)
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleEditStock(stock)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteStock(stock.symbol, region)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Manage Watchlist</h1>
            <p className="text-muted-foreground">
              Add, edit, or remove stocks from your monitoring list
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {userName && <span className="text-sm text-muted-foreground">Welcome, {userName}</span>}
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button onClick={handleLogout} variant="destructive">
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Current watchlist overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <div className="text-3xl font-bold">{totalStocks}</div>
                  <p className="text-sm text-muted-foreground">Total Stocks</p>
                </div>
                <div>
                  <div className="text-3xl font-bold">{usStocks.length}</div>
                  <p className="text-sm text-muted-foreground">US Stocks</p>
                </div>
                <div>
                  <div className="text-3xl font-bold">{indiaStocks.length}</div>
                  <p className="text-sm text-muted-foreground">India Stocks</p>
                </div>
                <div>
                  <div className="text-3xl font-bold">{totalWithTargets}</div>
                  <p className="text-sm text-muted-foreground">With Target Price</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAddingNew && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Stock</CardTitle>
                <CardDescription>Configure stock monitoring parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="region">Region *</Label>
                    <select
                      id="region"
                      value={newStock.region}
                      onChange={(e) =>
                        setNewStock({ ...newStock, region: e.target.value as "US" | "INDIA" })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="US">🇺🇸 United States</option>
                      <option value="INDIA">🇮🇳 India</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="symbol">Stock Symbol *</Label>
                    <Input
                      id="symbol"
                      placeholder={newStock.region === "US" ? "AAPL" : "RELIANCE.NS"}
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
                    <Label htmlFor="targetPrice">Target Price (Optional)</Label>
                    <Input
                      id="targetPrice"
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      value={newStock.targetPrice || ""}
                      onChange={(e) =>
                        setNewStock({ ...newStock, targetPrice: parseFloat(e.target.value) || 0 })
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
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleAddStock}>
                    <Check className="w-4 h-4 mr-2" />
                    Add Stock
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* US Stocks Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>🇺🇸 US Stocks</CardTitle>
                <CardDescription>
                  {usStocks.length} US stock{usStocks.length !== 1 ? "s" : ""} being monitored
                </CardDescription>
              </div>
              {!isAddingNew && (
                <Button
                  onClick={() => {
                    setAddingRegion("US");
                    setIsAddingNew(true);
                    setNewStock({ ...newStock, region: "US" });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add US Stock
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                renderStockTable(sortedUsStocks, "US")
              )}
            </CardContent>
          </Card>

          {/* India Stocks Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>🇮🇳 India Stocks</CardTitle>
                <CardDescription>
                  {indiaStocks.length} Indian stock{indiaStocks.length !== 1 ? "s" : ""} being
                  monitored
                </CardDescription>
              </div>
              {!isAddingNew && (
                <Button
                  onClick={() => {
                    setAddingRegion("INDIA");
                    setIsAddingNew(true);
                    setNewStock({ ...newStock, region: "INDIA" });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add India Stock
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                renderStockTable(sortedIndiaStocks, "INDIA")
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
                • <strong>Target Price:</strong> Optional - set if you have a specific exit target
              </li>
              <li>• Changes are saved locally - batch job will use updated settings on next run</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
