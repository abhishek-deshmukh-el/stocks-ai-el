"use client";

import { Region, type WatchlistStock, formatPrice } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Trash2, Edit2, X, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

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

interface StockTableViewProps {
  stocks: WatchlistStock[];
  region: Region;
  editingId: string | null;
  editForm: WatchlistStock | null;
  setEditForm: (form: WatchlistStock | null) => void;
  handleEditStock: (stock: WatchlistStock) => void;
  handleDeleteStock: (symbol: string, region: Region) => void;
  stockPrices: Map<string, StockPriceData>;
  fetchingPrices: boolean;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  setUsStocks: React.Dispatch<React.SetStateAction<WatchlistStock[]>>;
  setIndiaStocks: React.Dispatch<React.SetStateAction<WatchlistStock[]>>;
  toast: any;
  recommendations: Map<string, Recommendation>;
  sortField: SortField | null;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
}

export function StockTableView({
  stocks,
  region,
  editingId,
  editForm,
  setEditForm,
  handleEditStock,
  handleDeleteStock,
  stockPrices,
  fetchingPrices,
  handleSaveEdit,
  handleCancelEdit,
  setUsStocks,
  setIndiaStocks,
  toast,
  recommendations,
  sortField,
  sortDirection,
  handleSort,
}: StockTableViewProps) {
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

  if (stocks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {region} stocks in watchlist. Add your first stock!
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {stocks.map((stock) => (
          <Card key={stock.symbol} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-lg">{stock.symbol}</div>
                  <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
                </div>
                {editingId !== stock.symbol && (
                  <div className="flex gap-1">
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
                )}
              </div>

              {editingId === stock.symbol && editForm ? (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Symbol</Label>
                    <Input
                      value={editForm.symbol}
                      onChange={(e) =>
                        setEditForm({ ...editForm, symbol: e.target.value.toUpperCase() })
                      }
                      className="font-bold uppercase"
                      placeholder="AAPL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Apple Inc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Alert Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.alertPrice || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            alertPrice: parseFloat(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">ATR Period</Label>
                      <Input
                        type="number"
                        value={editForm.atrPeriod || 14}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            atrPeriod: parseInt(e.target.value) || 14,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">ATR Multiplier</Label>
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
                      />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editForm.owned || false}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              owned: e.target.checked,
                            })
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                        <Label className="text-xs cursor-pointer">Owned</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="default" onClick={handleSaveEdit} className="flex-1">
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Current Price</div>
                      <div className="font-semibold">
                        {stockPrices.has(stock.symbol)
                          ? formatPrice(stockPrices.get(stock.symbol)!.price, stock.symbol)
                          : fetchingPrices
                            ? "Loading..."
                            : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Alert Price</div>
                      <div className="font-semibold">
                        {stock.alertPrice ? formatPrice(stock.alertPrice, stock.symbol) : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">ATR Period</div>
                      <div className="font-semibold">{stock.atrPeriod || 14}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">ATR Multiplier</div>
                      <div className="font-semibold">{(stock.atrMultiplier || 2.0).toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={stock.owned || false}
                        onChange={async (e) => {
                          const updatedStock = { ...stock, owned: e.target.checked };
                          try {
                            const user = getCurrentUser();
                            if (!user) return;

                            const response = await fetch(`/api/watchlist`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                userId: user.id,
                                symbol: stock.symbol,
                                stock: updatedStock,
                              }),
                            });

                            const data = await response.json();

                            if (data.success) {
                              if (stock.region === Region.US) {
                                setUsStocks((prev) =>
                                  prev.map((s) => (s.symbol === stock.symbol ? updatedStock : s))
                                );
                              } else {
                                setIndiaStocks((prev) =>
                                  prev.map((s) => (s.symbol === stock.symbol ? updatedStock : s))
                                );
                              }
                              toast({
                                title: "Success",
                                description: `${stock.symbol} ownership status updated`,
                              });
                            } else {
                              toast({
                                title: "Error",
                                description: data.error || "Failed to update",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error("Failed to update owned status:", error);
                            toast({
                              title: "Error",
                              description: "Failed to update ownership status",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">Owned</span>
                    </div>
                    {region === Region.US && recommendations.has(stock.symbol) && (
                      <div>{getRecommendationBadge(recommendations.get(stock.symbol)!)}</div>
                    )}
                  </div>

                  {stockPrices.has(stock.symbol) && (
                    <div className="text-xs text-muted-foreground">
                      Last updated: {stockPrices.get(stock.symbol)!.fetchedAt.toLocaleTimeString()}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto w-full">
        <Table className="w-full" style={{ minWidth: "800px" }}>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted whitespace-nowrap"
                onClick={() => handleSort("symbol")}
              >
                Stock {getSortIcon("symbol")}
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-muted whitespace-nowrap"
                onClick={() => handleSort("alertPrice")}
              >
                Alert Price {getSortIcon("alertPrice")}
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-muted whitespace-nowrap"
                onClick={() => handleSort("atrPeriod")}
              >
                ATR Period {getSortIcon("atrPeriod")}
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-muted whitespace-nowrap"
                onClick={() => handleSort("atrMultiplier")}
              >
                ATR Multiplier {getSortIcon("atrMultiplier")}
              </TableHead>

              <TableHead className="whitespace-nowrap">Owned</TableHead>

              <TableHead
                className="cursor-pointer hover:bg-muted whitespace-nowrap"
                onClick={() => handleSort("price")}
              >
                Current Price {getSortIcon("price")}
              </TableHead>

              <TableHead className="whitespace-nowrap">Last Updated</TableHead>
              {region === Region.US && (
                <TableHead className="whitespace-nowrap">Analyst Rating</TableHead>
              )}
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map((stock) => (
              <TableRow key={stock.symbol}>
                {editingId === stock.symbol && editForm ? (
                  <>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground min-w-[50px]">
                            Symbol:
                          </Label>
                          <Input
                            value={editForm.symbol}
                            onChange={(e) =>
                              setEditForm({ ...editForm, symbol: e.target.value.toUpperCase() })
                            }
                            className="flex-1 min-w-[120px] font-bold uppercase"
                            placeholder="AAPL"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground min-w-[50px]">
                            Name:
                          </Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="flex-1 min-w-[200px]"
                            placeholder="Apple Inc."
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.alertPrice || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            alertPrice: parseFloat(e.target.value) || undefined,
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
                      <input
                        type="checkbox"
                        checked={editForm.owned || false}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            owned: e.target.checked,
                          })
                        }
                        className="w-4 h-4 cursor-pointer"
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
                    {region === Region.US && (
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
                      <div className="flex items-center gap-0.5">
                        <span className="font-bold whitespace-nowrap">{stock.symbol}</span>
                        <span className="text-muted-foreground">-</span>
                        <span
                          className="text-sm text-muted-foreground truncate max-w-[200px]"
                          title={stock.name}
                        >
                          {stock.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {stock.alertPrice ? formatPrice(stock.alertPrice, stock.symbol) : "-"}
                    </TableCell>
                    <TableCell>{stock.atrPeriod || 14}</TableCell>
                    <TableCell>{(stock.atrMultiplier || 2.0).toFixed(1)}</TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={stock.owned || false}
                        onChange={async (e) => {
                          const updatedStock = { ...stock, owned: e.target.checked };
                          try {
                            const user = getCurrentUser();
                            if (!user) return;

                            const response = await fetch(`/api/watchlist`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                userId: user.id,
                                symbol: stock.symbol,
                                stock: updatedStock,
                              }),
                            });

                            const data = await response.json();

                            if (data.success) {
                              if (stock.region === Region.US) {
                                setUsStocks((prev) =>
                                  prev.map((s) => (s.symbol === stock.symbol ? updatedStock : s))
                                );
                              } else {
                                setIndiaStocks((prev) =>
                                  prev.map((s) => (s.symbol === stock.symbol ? updatedStock : s))
                                );
                              }
                              toast({
                                title: "Success",
                                description: `${stock.symbol} ownership status updated`,
                              });
                            } else {
                              toast({
                                title: "Error",
                                description: data.error || "Failed to update",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error("Failed to update owned status:", error);
                            toast({
                              title: "Error",
                              description: "Failed to update ownership status",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
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
                    {region === Region.US && (
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
    </>
  );
}
