"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { isAuthenticated, getCurrentUser, logout, WatchlistItem } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userStocks, setUserStocks] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Get user info
    const user = getCurrentUser();
    if (user) {
      setUserName(user.name);
      setUserStocks([...user.usStocks, ...user.indiaStocks]);
    }

    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logout */}
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {userName}! 👋</h2>
            <p className="text-muted-foreground">Stock Volatility Monitoring Dashboard</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <main className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Automated Stock Monitoring
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Hourly volatility checks with WhatsApp alerts - completely hands-free
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg">
                <Link href="/batch">View Dashboard</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/watchlist">Manage Watchlist</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/stocks">Subscribe to Alerts</Link>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🤖 Fully Automated</CardTitle>
                <CardDescription>No manual input required</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  System automatically fetches stock prices via API every hour and calculates
                  volatility stops using ATR.
                </p>
                <Button asChild className="w-full">
                  <Link href="/batch">View Dashboard</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📊 {userStocks.length} Stocks Monitored</CardTitle>
                <CardDescription>
                  {userStocks.filter((s: WatchlistItem) => s.region === "US").length} US +{" "}
                  {userStocks.filter((s: WatchlistItem) => s.region === "INDIA").length} India
                  stocks tracked hourly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  <span className="block mb-2">
                    <strong>US:</strong>{" "}
                    {userStocks
                      .filter((s: WatchlistItem) => s.region === "US")
                      .map((s: WatchlistItem) => s.symbol)
                      .join(", ")}
                  </span>
                  <span className="block">
                    <strong>India:</strong>{" "}
                    {userStocks
                      .filter((s: WatchlistItem) => s.region === "INDIA")
                      .map((s: WatchlistItem) => s.symbol)
                      .join(", ")}
                  </span>
                </p>
                <Button asChild className="w-full" variant="secondary">
                  <Link href="/watchlist">Manage Watchlist</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
