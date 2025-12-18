"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { isAuthenticated, getCurrentUser, logout } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  // Login form state
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
            <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Stock Monitoring System
            </CardTitle>
            <CardDescription className="text-base mt-2">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Stock Monitoring Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back, {userName}!</p>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>🤖 Batch Monitor</CardTitle>
              <CardDescription>View automated monitoring status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Check hourly batch job status, view results, and manually trigger jobs
              </p>
              <Button asChild className="w-full">
                <Link href="/batch">Open Batch Monitor</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📝 Manage Watchlist</CardTitle>
              <CardDescription>Add, edit, or remove stocks</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your stock watchlist with regional organization
              </p>
              <Button asChild className="w-full" variant="secondary">
                <Link href="/watchlist">Manage Watchlist</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📈 View Stocks</CardTitle>
              <CardDescription>Browse monitored stocks</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View all stocks being monitored and subscribe to alerts
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link href="/stocks">View Stock List</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
