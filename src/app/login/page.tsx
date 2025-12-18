"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your WhatsApp number",
        variant: "destructive",
      });
      return;
    }

    // Basic phone validation (10-15 digits)
    const phoneRegex = /^\+?[\d\s\-()]{10,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number (10-15 digits)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Store user info in localStorage
    const userInfo = {
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      loginTime: new Date().toISOString(),
    };

    localStorage.setItem("user", JSON.stringify(userInfo));

    toast({
      title: "Login Successful! 🎉",
      description: `Welcome, ${name}!`,
    });

    // Redirect to dashboard
    setTimeout(() => {
      router.push("/");
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Welcome to Stock Monitor
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Enter your details to access automated stock monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll send stock alerts to this WhatsApp number
              </p>
            </div>

            <Button type="submit" className="w-full text-base h-11" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Continue to Dashboard"}
            </Button>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                By continuing, you&apos;ll receive automated stock volatility alerts via WhatsApp
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
