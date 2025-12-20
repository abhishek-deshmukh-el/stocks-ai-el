"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { isAuthenticated, getCurrentUser, logout } from "@/lib/auth";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      if (authenticated) {
        const user = getCurrentUser();
        if (user) {
          setUserName(user.name);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phoneNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and WhatsApp number",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number (10-15 digits)
    const phoneRegex = /^\+?[\d\s-]{10,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid WhatsApp number (10-15 digits)",
        variant: "destructive",
      });
      return;
    }

    // Store user info in localStorage
    const userInfo = {
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
    };
    localStorage.setItem("user", JSON.stringify(userInfo));

    toast({
      title: "Welcome! 👋",
      description: `Logged in as ${name}`,
    });

    setIsLoggedIn(true);
    setUserName(name);
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUserName("");
    setName("");
    setPhoneNumber("");
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Stock Monitoring System
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2">
              Login to access automated stock volatility monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter your WhatsApp number (10-15 digits)
                </p>
              </div>
              <Button type="submit" className="w-full" size="lg">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show dashboard if authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Stock Monitoring Dashboard
            </h1>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">🤖 Batch Monitor</CardTitle>
              <CardDescription className="text-sm">
                View automated monitoring status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Check hourly batch job status, view results, and manually trigger jobs
              </p>
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/batch">Open Batch Monitor</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">📝 Manage Watchlist</CardTitle>
              <CardDescription className="text-sm">Add, edit, or remove stocks</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your stock watchlist with regional organization
              </p>
              <div className="flex justify-center">
                <Button asChild variant="secondary">
                  <Link href="/watchlist">Manage Watchlist</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">📊 Volatility Stop</CardTitle>
              <CardDescription className="text-sm">
                Calculate volatility-based stop loss
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Analyze stock volatility and determine optimal stop-loss levels
              </p>
              <div className="flex justify-center">
                <Button asChild variant="outline">
                  <Link href="/volatility-stop">Volatility Analyzer</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
