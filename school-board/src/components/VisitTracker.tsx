"use client";
import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    const key = `sq_visit_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    fetch("/api/analytics/visit", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
