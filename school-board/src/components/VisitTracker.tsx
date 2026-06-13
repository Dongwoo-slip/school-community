"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISIT_TTL_MS = 30 * 60 * 1000;
const STORAGE_PREFIX = "square-visit-sent-at:";

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const key = `${STORAGE_PREFIX}${pathname}`;
    const now = Date.now();

    try {
      const prev = Number(window.sessionStorage.getItem(key) || "0");
      if (Number.isFinite(prev) && now - prev < VISIT_TTL_MS) return;
      window.sessionStorage.setItem(key, String(now));
    } catch {
      // Ignore storage failures and keep the tracker best-effort.
    }

    fetch("/api/analytics/visit", { method: "POST", keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
