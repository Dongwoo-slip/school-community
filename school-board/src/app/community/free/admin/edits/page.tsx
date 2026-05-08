"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  post_id: string;
  title: string | null;
  content: string | null;
  author_id: string | null;
  author_username: string | null;
  edited_by: string | null;
  edited_by_username: string | null;
  edited_at: string;
};

const KST_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
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

function cleanTitle(title?: string | null) {
  return String(title ?? "").replace(/^\[수정 로그\]\s*/, "") || "(제목 없음)";
}

export default function EditLogPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/edits", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? `불러오기 실패 (${res.status})`);
        return;
      }
      setErr(null);
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
          <div className="text-[14px] font-extrabold text-slate-900">수정 로그</div>
          <div className="mt-0.5 text-[12px] text-slate-600">게시글 수정 전/후 내용 확인용 - 관리자 전용</div>
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

      {err ? <div className="px-4 py-3 text-[12px] text-rose-700">⚠ {err}</div> : null}

      {loading ? (
        <div className="px-4 py-6 text-[12px] text-slate-600">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6 text-[12px] text-slate-600">수정 로그가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="border-b border-slate-200">
                <th className="whitespace-nowrap px-3 py-2 text-left">수정시간</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">수정자</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">작성자</th>
                <th className="px-3 py-2 text-left">제목 변경</th>
                <th className="px-3 py-2 text-left">수정 내용</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Post ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{fmt(r.edited_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="font-semibold text-slate-900">{r.edited_by_username ?? "알수없음"}</div>
                    <div className="text-[10px] text-slate-500">{shortId(r.edited_by)}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="font-semibold text-slate-900">{r.author_username ?? "알수없음"}</div>
                    <div className="text-[10px] text-slate-500">{shortId(r.author_id)}</div>
                  </td>
                  <td className="min-w-[220px] px-3 py-2">
                    <div className="break-words font-semibold text-slate-900">{cleanTitle(r.title)}</div>
                  </td>
                  <td className="min-w-[420px] px-3 py-2">
                    <div className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words text-slate-800">{r.content ?? ""}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{shortId(r.post_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
        ※ UUID는 보기 편하게 일부만 표시됩니다.
      </div>
    </div>
  );
}
