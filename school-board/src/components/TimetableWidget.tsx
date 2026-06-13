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

function clampInt(v: unknown, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const x = Math.floor(n);
  if (x < min || x > max) return null;
  return x;
}

export default function TimetableWidget() {
  const [grade, setGrade] = useState("1");
  const [classNm, setClassNm] = useState("1");
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
        const g = me?.verifiedGrade ?? me?.grade ?? me?.school_grade ?? null;
        const c = me?.verifiedClassNo ?? me?.classNo ?? me?.class_no ?? me?.classNm ?? null;
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
    let ignore = false;
    setLoading(true);
    async function load() {
      try {
        const res = await fetch(url);
        const j = await res.json();
        if (!ignore) setData(j);
      } catch (e) {
        if (!ignore) setData({ ok: false, error: String(e) });
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [url, initDone]);

  const busy = loading || !initDone;
  const days = data?.ok ? data.days ?? [] : [];
  const grid = data?.ok ? data.grid ?? [] : [];
  const noData = data?.ok && !data.hasData && !busy;

  return (
    <section className="glass overflow-hidden w-full">
      {/* Header */}
      <div className="timetable-header px-4 py-4 sm:px-6" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CJHS TimeTable</h3>
          </div>

          <div className="timetable-controls flex items-center gap-1.5">
            <select
              className="border px-2 py-1 text-[11px] font-medium outline-none"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              value={grade}
              onChange={(e) => { markTouched(); setGrade(e.target.value); setWeekOffset(0); }}
              disabled={busy}
            >
              {[1, 2, 3].map(v => <option key={v} value={v}>{v}학년</option>)}
            </select>
            <select
              className="border px-2 py-1 text-[11px] font-medium outline-none"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
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

        <div className="timetable-week-nav mt-4 flex items-center justify-between gap-2">
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
            <div className="text-[11px] font-semibold" style={{ color: 'var(--brand)' }}>
              {days.length ? rangeLabel(days) : busy ? "..." : "정보 없음"}
            </div>
            {weekOffset !== 0 && (
              <span className="text-[9px] font-medium text-slate-500">오늘로 돌아가기</span>
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
          <p className="text-sm font-medium text-slate-400">이번 주 시간표가 없습니다</p>
          <p className="mt-1 text-[10px] text-slate-600">학교에서 NEIS에 시간표를 아직 등록하지 않았거나,<br />방학 기간일 수 있습니다.</p>
        </div>
      ) : (
        <div className="timetable-body p-1 sm:p-2">
          <div className="overflow-x-auto no-scrollbar">
            <div className="timetable-grid">
              {/* Table Header */}
              <div className="timetable-row gap-1 sm:gap-2 mb-1 sm:mb-2">
                <div
                  className="timetable-cell timetable-day flex items-center justify-center py-2 text-[11px] font-semibold"
                  style={{ background: '#eef6ff', color: 'var(--brand-light)', border: '1px solid rgba(31, 126, 219, 0.14)' }}
                >
                  교시
                </div>
                {Array.from({ length: 5 }, (_, i) => {
                  const h = dayHeader(days[i] ?? "", i);
                  return (
                    <div
                      key={i}
                      className="timetable-cell timetable-day flex flex-col items-center justify-center py-2"
                      style={{ background: '#dceeff', border: '1px solid rgba(31, 126, 219, 0.14)' }}
                    >
                      <span className="timetable-day-name text-[11px] font-semibold" style={{ color: 'var(--brand-light)' }}>{h.name}</span>
                      <span className="timetable-day-date text-[10px]" style={{ color: 'rgba(15,95,183,0.68)' }}>{h.date}</span>
                    </div>
                  );
                })}
              </div>

              {/* Table Body */}
              <div className="space-y-1 sm:space-y-2">
                {Array.from({ length: 7 }, (_, p) => (
                  <div key={p} className="timetable-row gap-1 sm:gap-2">
                    <div
                      className="timetable-cell timetable-period flex items-center justify-center text-[12px] font-semibold"
                      style={{ background: '#dceeff', color: 'var(--brand-light)', border: '1px solid rgba(31, 126, 219, 0.14)' }}
                    >
                      {p + 1}
                    </div>
                    {Array.from({ length: 5 }, (_, c) => {
                      const subject = grid?.[p]?.[c] || "";
                      const isBlank = !grid?.[p]?.[c];
                      return (
                        <div
                          key={c}
                          className="timetable-cell flex items-center justify-center p-2 text-center transition-all"
                          style={{
                            background: isBlank ? '#f8fafc' : 'var(--bg-elevated)',
                            color: isBlank ? 'var(--text-faint)' : 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          <span className="timetable-subject text-[11px] font-medium leading-snug">
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
        <div className="px-6 py-4 text-center text-[11px]" style={{ color: 'var(--accent-red)', background: 'rgba(200,45,63,0.08)' }}>
          시간표 정보를 불러올 수 없습니다.
        </div>
      )}

      <div className="px-6 py-2 text-[10px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
        * 기본은 1학년 1반입니다. 마이페이지에서 학년/반을 저장하면 다음 접속부터 자동으로 해당 반 시간표가 표시됩니다.
      </div>
    </section>
  );
}
