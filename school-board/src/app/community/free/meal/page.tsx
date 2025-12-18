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
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
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

  const title = useMemo(() => `🍱 급식 정보 (${fmtYMD(ymd)})`, [ymd]);

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
    <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/community/free" className="text-sm text-slate-700 hover:underline">
          ← 자유게시판
        </Link>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>

      <section className="border border-slate-300 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setYmd(addDays(ymd, -1))}
              className="border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              ◀ 전날
            </button>
            <button
              type="button"
              onClick={() => setYmd(todayYMD())}
              className="border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => setYmd(addDays(ymd, 1))}
              className="border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              다음날 ▶
            </button>
          </div>

          <div className="text-[12px] text-slate-600">
            기준일: <span className="font-semibold text-slate-900">{fmtYMD(ymd)}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="border border-slate-200 bg-white p-4">
            <div className="mb-2 text-[13px] font-bold text-slate-900">점심</div>
            {loading ? <div className="text-[12px] text-slate-600">불러오는 중…</div> : null}
            {err ? <div className="text-[12px] text-rose-600">{err}</div> : null}
            {!loading && !err && lunch.length === 0 ? <div className="text-[12px] text-slate-600">급식 정보 없음</div> : null}
            {lunch.length > 0 ? (
              <ul className="space-y-1">
                {lunch.map((x, i) => (
                  <li key={`l-${i}-${x}`} className="text-[12px] text-slate-800 leading-snug">
                    • {x}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="border border-slate-200 bg-white p-4">
            <div className="mb-2 text-[13px] font-bold text-slate-900">저녁</div>
            {loading ? <div className="text-[12px] text-slate-600">불러오는 중…</div> : null}
            {err ? <div className="text-[12px] text-rose-600">{err}</div> : null}
            {!loading && !err && dinner.length === 0 ? <div className="text-[12px] text-slate-600">급식 정보 없음</div> : null}
            {dinner.length > 0 ? (
              <ul className="space-y-1">
                {dinner.map((x, i) => (
                  <li key={`d-${i}-${x}`} className="text-[12px] text-slate-800 leading-snug">
                    • {x}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">※ 주말/방학/휴업일에는 급식이 없을 수 있어요.</div>
      </section>
    </main>
  );
}
