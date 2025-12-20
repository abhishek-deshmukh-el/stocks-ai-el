"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [userName, setUserName] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (user) {
      setUserName(user.name);
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="text-xl font-semibold">Stock Seller</div>
          <div className="flex items-center gap-4">
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="text-xl font-semibold">Stock Seller</div>

        <div className="flex items-center gap-4">
          {userName && <span className="text-sm font-medium">{userName}</span>}

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
