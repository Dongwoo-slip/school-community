"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function addDays(ymd: string, delta: number) {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function fmtYMD(ymd: string) {
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

function stripDish(raw: string) {
  let s = raw.replace(/\*/g, "").trim();
  s = s.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  return s;
}

export default function MealPage() {
  const [ymd, setYmd] = useState<string>(todayYMD());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lunch, setLunch] = useState<string[]>([]);
  const [dinner, setDinner] = useState<string[]>([]);

  const title = useMemo(() => `급식 정보`, [ymd]);

  async function load(targetYmd: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/neis/meal?ymd=${encodeURIComponent(targetYmd)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        setErr(json?.error ?? "급식 정보를 불러오지 못했습니다.");
        setLunch([]);
        setDinner([]);
        return;
      }
      setLunch((Array.isArray(json?.lunch) ? json.lunch : []).map(stripDish).filter(Boolean));
      setDinner((Array.isArray(json?.dinner) ? json.dinner : []).map(stripDish).filter(Boolean));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(ymd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <span className="text-4xl">🍱</span> {title}
          </h2>
          <p className="mt-1 text-xs font-bold text-sky-400 uppercase tracking-widest">
            {fmtYMD(ymd)} Daily Menu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setYmd(addDays(ymd, -1))}
            className="btn-ghost px-4 py-2"
          >
            ◀ 이전
          </button>
          <button
            onClick={() => setYmd(todayYMD())}
            className="btn-secondary px-6 py-2"
          >
            오늘
          </button>
          <button
            onClick={() => setYmd(addDays(ymd, 1))}
            className="btn-ghost px-4 py-2"
          >
            다음 ▶
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Lunch Card */}
        <div className="glass overflow-hidden rounded-[2rem] p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-2xl">🌞</span> 점심
            </h3>
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-black text-sky-400 uppercase tracking-widest">
              Lunch
            </span>
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-6">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-white/5 w-full" />
                ))}
              </div>
            ) : err ? (
              <div className="py-12 text-center text-sm font-medium text-rose-400/70">{err}</div>
            ) : lunch.length === 0 ? (
              <div className="py-12 text-center text-sm font-medium text-slate-600 italic">메뉴 정보가 없습니다.</div>
            ) : (
              <ul className="space-y-3">
                {lunch.map((x, i) => (
                  <li key={`l-${i}-${x}`} className="flex items-center gap-3 text-sm font-medium text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                    {x}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Dinner Card */}
        <div className="glass overflow-hidden rounded-[2rem] p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-2xl">🌙</span> 저녁
            </h3>
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
              Dinner
            </span>
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-6">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-white/5 w-full" />
                ))}
              </div>
            ) : err ? (
              <div className="py-12 text-center text-sm font-medium text-rose-400/70">{err}</div>
            ) : dinner.length === 0 ? (
              <div className="py-12 text-center text-sm font-medium text-slate-600 italic">메뉴 정보가 없습니다.</div>
            ) : (
              <ul className="space-y-3">
                {dinner.map((x, i) => (
                  <li key={`d-${i}-${x}`} className="flex items-center gap-3 text-sm font-medium text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {x}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-xs font-bold text-slate-600 tracking-wide">
          ※ 주말/방학/휴업일에는 급식 정보가 표시되지 않을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
