"use client";

import { useEffect, useMemo, useState } from "react";

type TT = {
  ok: boolean;
  error?: string;
  grade?: string;
  classNm?: string;
  weekOffset?: number;
  days?: string[];   // YYYYMMDD x 5
  grid?: string[][]; // 7 x 5
};

function dayHeader(ymd: string, idx: number) {
  const names = ["월", "화", "수", "목", "금"];
  if (!ymd) return names[idx];
  const mm = ymd.slice(4, 6);
  const dd = ymd.slice(6, 8);
  return `${names[idx]} ${mm}/${dd}`;
}

function rangeLabel(days: string[]) {
  if (!days?.length) return "";
  const s = days[0];
  const e = days[4] ?? days[days.length - 1];
  const sm = s.slice(4, 6), sd = s.slice(6, 8);
  const em = e.slice(4, 6), ed = e.slice(6, 8);
  return `${sm}/${sd} ~ ${em}/${ed}`;
}

function cellText(v: string | undefined | null) {
  const t = (v ?? "").trim();
  return t ? t : "공강";
}

export default function TimetableWidget() {
  const [grade, setGrade] = useState("2");
  const [classNm, setClassNm] = useState("7");
  const [weekOffset, setWeekOffset] = useState(0);

  const [data, setData] = useState<TT | null>(null);
  const [loading, setLoading] = useState(false);

  const url = useMemo(
    () =>
      `/api/timetable?grade=${encodeURIComponent(grade)}&class=${encodeURIComponent(
        classNm
      )}&weekOffset=${encodeURIComponent(String(weekOffset))}`,
    [grade, classNm, weekOffset]
  );

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch((e) => setData({ ok: false, error: String(e) }))
      .finally(() => setLoading(false));
  }, [url]);

  const days = data?.ok ? data.days ?? [] : [];
  const grid = data?.ok ? data.grid ?? [] : [];

  return (
    // ✅ 가로폭 "조금 더" 증가: 410 -> 440
    <section className="w-full max-w-[440px] border border-slate-400 bg-white">
      <div className="px-3 py-3 border-b border-slate-400 bg-white">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] font-semibold text-slate-900">시간표</div>

          <div className="flex items-center gap-2">
            <select
              className="border border-slate-300 bg-white text-slate-900 px-2 py-1 text-[12px]"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={loading}
            >
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>

            <select
              className="border border-slate-300 bg-white text-slate-900 px-2 py-1 text-[12px]"
              value={classNm}
              onChange={(e) => setClassNm(e.target.value)}
              disabled={loading}
            >
              {Array.from({ length: 20 }, (_, i) => String(i + 1)).map((n) => (
                <option key={n} value={n}>
                  {n}반
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            className="border border-slate-300 bg-white text-slate-900 px-2 py-1 text-[12px] hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setWeekOffset((v) => v - 1)}
            disabled={loading}
            type="button"
          >
            ← 저번주
          </button>

          <div className="min-w-0 text-center text-[12px] font-semibold text-slate-900">
            <span className="block truncate">
              {days.length ? rangeLabel(days) : loading ? "불러오는 중…" : ""}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              className="border border-slate-300 bg-white text-slate-900 px-2 py-1 text-[12px] hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setWeekOffset(0)}
              disabled={loading || weekOffset === 0}
              type="button"
              title="이번주로"
            >
              이번주
            </button>

            <button
              className="border border-slate-300 bg-white text-slate-900 px-2 py-1 text-[12px] hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setWeekOffset((v) => v + 1)}
              disabled={loading}
              type="button"
            >
              다음주 →
            </button>
          </div>
        </div>
      </div>

      {!data?.ok && !loading && (
        <div className="px-3 py-3 text-[12px] text-red-600">
          시간표를 불러오지 못했어: {data?.error}
        </div>
      )}

      <div className="px-2 pb-2">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-white">
              <th className="border border-slate-200 px-2 py-2 text-left w-[44px] text-[11px] font-semibold text-slate-900">
                교시
              </th>
              {Array.from({ length: 5 }, (_, i) => (
                <th
                  key={i}
                  className="border border-slate-200 px-2 py-2 text-left text-[11px] font-semibold text-slate-900"
                >
                  <span className="block truncate">{dayHeader(days[i] ?? "", i)}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: 7 }, (_, p) => (
              <tr key={p} className="hover:bg-slate-50">
                <td className="border border-slate-200 px-2 py-3 text-[11px] font-semibold text-slate-900 bg-slate-50">
                  {p + 1}
                </td>

                {Array.from({ length: 5 }, (_, c) => {
                  const raw = data?.ok ? grid?.[p]?.[c] : "";
                  const text = data?.ok ? cellText(raw) : "공강";

                  return (
                    <td key={c} className="border border-slate-200 px-2 py-3 text-[12px] text-slate-900">
                      <span className="block truncate">{text}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 px-1 text-[11px] text-slate-500">
          * 빈 칸은 공강으로 표시됩니다.
        </div>
      </div>
    </section>
  );
}
