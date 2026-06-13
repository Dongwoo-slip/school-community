"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at?: string | null;
  is_deleted: boolean;
};

function kstTodayIndex() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function targetDateIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function ddayText(value: string) {
  const target = targetDateIndex(value);
  if (target === null) return "-";
  const diff = target - kstTodayIndex();
  if (diff === 0) return "D-Day";
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export default function AdminDdayPage() {
  const [eventName, setEventName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!eventName.trim() || !targetDate) return null;
    return `${eventName.trim()} ${ddayText(targetDate)}`;
  }, [eventName, targetDate]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dday", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "불러오기 실패");
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

  async function save() {
    if (busy) return;
    if (eventName.trim().length < 1) return setMsg("행사 이름을 입력하세요.");
    if (!targetDate) return setMsg("날짜를 선택하세요.");

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/dday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventName: eventName.trim(), targetDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "저장 실패");
        return;
      }
      setEventName("");
      setTargetDate("");
      setMsg("D-Day를 추가했습니다. 기존 D-Day는 그대로 유지됩니다.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function disable(id: string) {
    if (!confirm("이 D-Day 표시를 끌까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/dday?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        alert(json?.error ?? "비활성화 실패");
        return;
      }
      setMsg("D-Day 표시를 껐습니다.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="border border-slate-300 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-[16px] font-black text-slate-950">D-Day 관리</h2>
          <p className="mt-1 text-[12px] font-medium text-slate-600">
            행사 이름과 날짜를 저장하면 상단 탭 오른쪽에 모든 방문자에게 작게 표시됩니다. 여러 개를 등록할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input
            className="w-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-sky-500"
            placeholder="행사 이름 예) 수능"
            value={eventName}
            maxLength={40}
            onChange={(e) => setEventName(e.target.value)}
          />
          <input
            type="date"
            className="w-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-sky-500"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
          <button type="button" className="btn-primary px-5 py-2 text-sm" onClick={save} disabled={busy}>
            {busy ? "처리 중..." : "확인"}
          </button>
        </div>

        {preview ? (
          <div className="mt-4 inline-flex items-center gap-2 border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] font-black text-sky-900">
            미리보기 <span className="text-sky-700">{preview}</span>
          </div>
        ) : null}
        {msg ? <div className="mt-3 text-[12px] font-bold text-slate-700">{msg}</div> : null}
      </section>

      <section className="border border-slate-300 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-[14px] font-black text-slate-950">D-Day 기록</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">활성 D-Day가 날짜순으로 먼저 표시됩니다.</div>
          </div>
          <button type="button" className="border border-slate-300 px-3 py-2 text-[12px] font-bold" onClick={load} disabled={loading}>
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-[12px] text-slate-600">불러오는 중...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-[12px] text-slate-600">등록된 D-Day가 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.id} className={`flex items-center gap-3 px-4 py-3 ${row.is_deleted ? "bg-slate-50 opacity-60" : "bg-white"}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-black text-slate-950">{row.title}</span>
                    <span className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-black text-slate-800">
                      {ddayText(row.content ?? "")}
                    </span>
                    <span className={`text-[10px] font-black ${row.is_deleted ? "text-slate-500" : "text-sky-700"}`}>
                      {row.is_deleted ? "비활성" : "활성"}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-500">
                    날짜 {row.content || "-"} · 등록 {fmt(row.created_at)}
                  </div>
                </div>
                {!row.is_deleted ? (
                  <button
                    type="button"
                    className="border border-slate-300 px-3 py-2 text-[12px] font-bold text-slate-800"
                    onClick={() => disable(row.id)}
                    disabled={busy}
                  >
                    끄기
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
