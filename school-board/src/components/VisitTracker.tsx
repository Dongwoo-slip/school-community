"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/analytics/visit", { method: "POST" }).catch(() => {});
  }, [pathname]);

  return null;
}
