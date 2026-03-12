"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TT = {
  ok: boolean;
  hasData?: boolean;
  error?: string;
  grade?: string;
  classNm?: string;
  weekOffset?: number;
  days?: string[];   // YYYYMMDD x 5
  grid?: string[][]; // 7 x 5
};

function dayHeader(ymd: string, idx: number) {
  const names = ["월", "화", "수", "목", "금"];
  if (!ymd) return { name: names[idx], date: "--.--" };
  const mm = ymd.slice(4, 6);
  const dd = ymd.slice(6, 8);
  return { name: names[idx], date: `${mm}.${dd}` };
}

function rangeLabel(days: string[]) {
  if (!days?.length) return "";
  const s = days[0];
  const e = days[4] ?? days[days.length - 1];
  const sm = s.slice(4, 6), sd = s.slice(6, 8);
  const em = e.slice(4, 6), ed = e.slice(6, 8);
  return `${sm}.${sd} - ${em}.${ed}`;
}

function clampInt(v: any, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const x = Math.floor(n);
  if (x < min || x > max) return null;
  return x;
}

export default function TimetableWidget() {
  const [grade, setGrade] = useState("2");
  const [classNm, setClassNm] = useState("7");
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<TT | null>(null);
  const [loading, setLoading] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const touchedRef = useRef(false);

  const markTouched = () => { touchedRef.current = true; };

  useEffect(() => {
    let ignore = false;
    async function initFromMe() {
      try {
        const res = await fetch("/api/me", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const me = await res.json().catch(() => ({}));
        const g = me?.grade ?? me?.school_grade ?? null;
        const c = me?.classNm ?? me?.class_no ?? null;
        const gg = clampInt(g, 1, 3);
        const cc = clampInt(c, 1, 11);
        if (!ignore && !touchedRef.current) {
          if (gg !== null) setGrade(String(gg));
          if (cc !== null) setClassNm(String(cc));
        }
      } catch { } finally { if (!ignore) setInitDone(true); }
    }
    initFromMe();
    return () => { ignore = true; };
  }, []);

  const url = useMemo(() => `/api/timetable?grade=${grade}&class=${classNm}&weekOffset=${weekOffset}`, [grade, classNm, weekOffset]);

  useEffect(() => {
    if (!initDone) return;
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(j => setData(j))
      .catch(e => setData({ ok: false, error: String(e) }))
      .finally(() => setLoading(false));
  }, [url, initDone]);

  const busy = loading || !initDone;
  const days = data?.ok ? data.days ?? [] : [];
  const grid = data?.ok ? data.grid ?? [] : [];
  const hasData = data?.ok ? (data.hasData ?? false) : false;
  const noData = data?.ok && !data.hasData && !busy;

  return (
    <section className="glass overflow-hidden rounded-2xl w-full">
      {/* Header */}
      <div className="bg-white/5 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">CJHS TimeTable</h3>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/30"
              value={grade}
              onChange={(e) => { markTouched(); setGrade(e.target.value); setWeekOffset(0); }}
              disabled={busy}
            >
              {[1, 2, 3].map(v => <option key={v} value={v}>{v}학년</option>)}
            </select>
            <select
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/30"
              value={classNm}
              onChange={(e) => { markTouched(); setClassNm(e.target.value); setWeekOffset(0); }}
              disabled={busy}
            >
              {Array.from({ length: 11 }, (_, i) => String(i + 1)).map(n => (
                <option key={n} value={n}>{n}반</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            disabled={busy}
            className="btn-ghost py-1 px-3 text-[11px]"
          >
            ← 이전주
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            disabled={busy || weekOffset === 0}
            className="flex flex-col items-center group"
          >
            <div className="text-[11px] font-bold text-sky-400 group-hover:text-sky-300">
              {days.length ? rangeLabel(days) : busy ? "..." : "정보 없음"}
            </div>
            {weekOffset !== 0 && (
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">오늘로 돌아가기</span>
            )}
          </button>
          <button
            onClick={() => setWeekOffset(v => v + 1)}
            disabled={busy}
            className="btn-ghost py-1 px-3 text-[11px]"
          >
            다음주 →
          </button>
        </div>
      </div>

      {/* Grid */}
      {noData ? (
        <div className="p-8 text-center">
          <p className="text-sm font-bold text-slate-400">이번 주 시간표가 없습니다</p>
          <p className="mt-1 text-[10px] text-slate-600">학교에서 NEIS에 시간표를 아직 등록하지 않았거나,<br />방학 기간일 수 있습니다.</p>
        </div>
      ) : (
        <div className="p-1 sm:p-2">
          <div className="overflow-x-auto no-scrollbar">
            <div className="min-w-[500px] md:min-w-0">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr] gap-1 sm:gap-2 mb-1 sm:mb-2">
                <div className="flex items-center justify-center rounded-lg bg-white/5 py-2 text-[10px] font-bold text-slate-500 uppercase">
                  교시
                </div>
                {Array.from({ length: 5 }, (_, i) => {
                  const h = dayHeader(days[i] ?? "", i);
                  return (
                    <div key={i} className="flex flex-col items-center justify-center rounded-lg bg-white/5 py-2">
                      <span className="text-[10px] font-black text-white">{h.name}</span>
                      <span className="text-[9px] text-slate-500">{h.date}</span>
                    </div>
                  );
                })}
              </div>

              {/* Table Body */}
              <div className="space-y-1 sm:space-y-2">
                {Array.from({ length: 7 }, (_, p) => (
                  <div key={p} className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr] gap-1 sm:gap-2">
                    <div className="flex items-center justify-center rounded-lg bg-sky-500/10 text-[11px] font-black text-sky-400">
                      {p + 1}
                    </div>
                    {Array.from({ length: 5 }, (_, c) => {
                      const subject = grid?.[p]?.[c] || "";
                      const isBlank = !grid?.[p]?.[c];
                      return (
                        <div
                          key={c}
                          className={`flex items-center justify-center rounded-lg p-2 text-center transition-all ${isBlank
                            ? "bg-white/[0.02] text-slate-600"
                            : "bg-white/5 text-slate-200 hover:bg-white/10 hover:scale-[1.02]"
                            }`}
                        >
                          <span className="truncate text-[11px] font-medium leading-tight">
                            {isBlank ? "·" : subject}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!data?.ok && !busy && data?.error && (
        <div className="px-6 py-4 text-center text-[11px] text-rose-400 bg-rose-500/10">
          시간표 정보를 불러올 수 없습니다.
        </div>
      )}

      <div className="bg-white/5 px-6 py-2 text-[10px] text-slate-600">
        * 학년/반 설정을 통해 다른 학급의 시간표도 확인할 수 있습니다.
      </div>
    </section>
  );
}
