"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, ArrowLeft } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [userName, setUserName] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (user) {
      setUserName(user.name);
    }

    // Check if there's history to go back to
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleBack = () => {
    router.back();
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Check if we're on the home page or login page
  const isHomePage = pathname === "/" || pathname === "/login";
  const showBackButton = mounted && canGoBack && !isHomePage;

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
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <div className="flex items-center gap-1 sm:gap-2">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
          <div className="text-base sm:text-xl font-semibold">Stock Seller</div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          {userName && (
            <span className="hidden sm:inline text-sm font-medium truncate max-w-[100px] md:max-w-none">
              {userName}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
