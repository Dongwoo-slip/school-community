"use client";

import { useEffect, useState } from "react";

type LoginLog = {
  id: string;
  admin_id: string | null;
  username: string | null;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_label: string | null;
  browser: string | null;
  os: string | null;
  platform: string | null;
  screen: string | null;
  language: string | null;
  timezone: string | null;
};

const KST_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function fmt(iso: string) {
  try {
    return KST_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

function shortId(id?: string | null) {
  if (!id) return "-";
  return id.length > 14 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
}

export default function AdminLoginLogsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LoginLog[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login-logs", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? `불러오기 실패 (${res.status})`);
        return;
      }
      setErr(null);
      setSetupRequired(Boolean(json.setupRequired));
      setRows(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="border border-slate-300 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-[14px] font-extrabold text-slate-900">관리자 로그인 로그</div>
          <div className="mt-0.5 text-[12px] text-slate-600">admin 계정 로그인 시간과 접속 기기 기록</div>
        </div>
        <button
          type="button"
          onClick={load}
          className="border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
          disabled={loading}
        >
          새로고침
        </button>
      </div>

      {err ? <div className="px-4 py-3 text-[12px] text-rose-700">{err}</div> : null}
      {setupRequired ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
          DB에 admin_login_logs 테이블 생성이 필요합니다. Supabase SQL Editor에서 supabase/20260616_admin_login_logs.sql을 실행해 주세요.
        </div>
      ) : null}

      {loading ? (
        <div className="px-4 py-6 text-[12px] text-slate-600">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6 text-[12px] text-slate-600">아직 로그인 로그가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="border-b border-slate-200">
                <th className="whitespace-nowrap px-3 py-2 text-left">로그인 시간</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">관리자</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">기기</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">환경</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-800">{fmt(r.login_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="font-semibold text-slate-900">{r.username ?? "admin"}</div>
                    <div className="text-[10px] text-slate-500">{shortId(r.admin_id)}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="font-semibold text-slate-900">{r.device_label ?? "-"}</div>
                    <div className="text-[10px] text-slate-500">{[r.platform, r.screen].filter(Boolean).join(" · ") || "-"}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="font-semibold text-slate-900">{[r.os, r.browser].filter(Boolean).join(" / ") || "-"}</div>
                    <div className="text-[10px] text-slate-500">{[r.language, r.timezone].filter(Boolean).join(" · ") || "-"}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.ip_address ?? "-"}</td>
                  <td className="min-w-[340px] px-3 py-2 text-slate-600">
                    <div className="max-w-[560px] break-words">{r.user_agent ?? "-"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
        최근 300개 기록만 표시됩니다.
      </div>
    </div>
  );
}
