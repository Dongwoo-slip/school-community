"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  actor_username: string | null;
  post_id: string | null;
  created_at: string;
  read: boolean;
};

function fmt(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/reports", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error ?? "불러오기 실패");
        setRows([]);
        return;
      }
      setRows(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="border border-slate-300 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[16px] font-bold text-slate-900">🚩 신고 접수된 글</div>
        <Link href="/community/free" className="text-[12px] text-slate-600 hover:underline">
          ← 돌아가기
        </Link>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="text-[12px] text-slate-600">불러오는 중…</div>
        ) : err ? (
          <div className="text-[12px] text-rose-600">{err}</div>
        ) : rows.length === 0 ? (
          <div className="text-[12px] text-slate-600">신고 내역이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const actor = r.actor_username ?? "익명";
              const href = r.post_id ? `/community/free/${encodeURIComponent(r.post_id)}` : "/community/free";
              return (
                <li key={r.id} className="py-3">
                  <Link href={href} className="block hover:underline">
                    <div className="text-[13px] text-slate-900">
                      {actor}님이 신고했습니다.
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{fmt(r.created_at)}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
