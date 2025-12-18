"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { US_STOCKS, INDIA_STOCKS } from "@/lib/constants";
import { isAuthenticated, getCurrentUser, logout } from "@/lib/auth";
import Link from "next/link";

export default function StockAnalyzer() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
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
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const subscribeToAlerts = async () => {
    if (!phoneNumber) {
      toast({
        title: "Missing WhatsApp Number",
        description: "Please enter your WhatsApp number to receive alerts",
        variant: "destructive",
      });
      return;
    }

    // In production, this would save to a database
    toast({
      title: "Subscribed! 💬",
      description:
        "You'll receive WhatsApp alerts for all stocks in the watchlist via hourly batch jobs",
    });

    console.log("📱 Subscription saved (demo mode):");
    console.log("WhatsApp:", phoneNumber);
    console.log("Stocks:", selectedSymbol || "All");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Stock Volatility Monitoring</h1>
            <p className="text-muted-foreground">
              Automated hourly monitoring with WhatsApp alerts
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

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>📊 How It Works</CardTitle>
              <CardDescription>Fully automated stock monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">1</Badge>
                  <div>
                    <p className="font-medium">Automatic Data Fetch</p>
                    <p className="text-sm text-muted-foreground">
                      System fetches real-time prices via API every hour
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge className="mt-1">2</Badge>
                  <div>
                    <p className="font-medium">Volatility Calculation</p>
                    <p className="text-sm text-muted-foreground">
                      Calculates ATR and stop-loss levels automatically
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge className="mt-1">3</Badge>
                  <div>
                    <p className="font-medium">Smart Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      WhatsApp alerts sent only when stops are triggered
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Default Settings:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• ATR Period: 14 days</li>
                  <li>• ATR Multiplier: 2.0x (2.5x for volatile stocks)</li>
                  <li>• Check Frequency: Every hour</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🔔 Subscribe to Alerts</CardTitle>
              <CardDescription>Get WhatsApp notifications for volatility alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Receive alerts for all {US_STOCKS.length + INDIA_STOCKS.length} monitored stocks
                  (US & India)
                </p>
              </div>

              <Button onClick={subscribeToAlerts} className="w-full">
                Subscribe to Alerts
              </Button>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">What you&apos;ll receive:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ Stop loss triggered alerts</li>
                  <li>✅ High volatility warnings</li>
                  <li>✅ Price approaching stop notifications</li>
                  <li>✅ Hourly batch summary</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>📈 Monitored Stocks</CardTitle>
            <CardDescription>
              {US_STOCKS.length + INDIA_STOCKS.length} stocks ({US_STOCKS.length} US +{" "}
              {INDIA_STOCKS.length} India) monitored every hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>🇺🇸</span> US Stocks ({US_STOCKS.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {US_STOCKS.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="font-bold text-lg">{stock.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
                    <div className="text-sm mt-2">
                      <div className="text-xs text-muted-foreground">Target</div>
                      <div className="font-medium">${stock.targetPrice?.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>🇮🇳</span> India Stocks ({INDIA_STOCKS.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {INDIA_STOCKS.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="font-bold text-lg">{stock.symbol.replace(".NS", "")}</div>
                    <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
                    <div className="text-sm mt-2">
                      <div className="text-xs text-muted-foreground">Target</div>
                      <div className="font-medium">₹{stock.targetPrice?.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">💡 Want to manage the watchlist?</p>
              <p className="text-sm text-muted-foreground mb-3">
                Add, edit, or remove stocks from your monitoring list
              </p>
              <Button asChild variant="secondary">
                <Link href="/watchlist">Manage Watchlist</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
