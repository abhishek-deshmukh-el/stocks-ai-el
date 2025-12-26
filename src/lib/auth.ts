/**
 * Authentication utilities
 */

export interface WatchlistItem {
  symbol: string;
  name: string;
  targetPrice?: number;
  atrPeriod: number;
  atrMultiplier: number;
  region: "US" | "INDIA";
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserInfo {
  id: string;
  name: string;
  phoneNumber: string;
  usStocks: WatchlistItem[];
  indiaStocks: WatchlistItem[];
}

/**
 * Check if user is logged in
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;

  const user = localStorage.getItem("user");
  return !!user;
}

/**
 * Get current user info
 */
export function getCurrentUser(): UserInfo | null {
  if (typeof window === "undefined") return null;

  const user = localStorage.getItem("user");
  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

/**
 * Logout user
 */
export function logout(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("user");
}
