"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show header on login page
  const showHeader = pathname !== "/login";

  return (
    <>
      {showHeader && <Header />}
      {children}
    </>
  );
}
