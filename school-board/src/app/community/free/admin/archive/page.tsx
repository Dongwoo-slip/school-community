"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type ArchivedPost = {
  id: string;
  board: string;
  title: string | null;
  content: string | null;
  author_id: string | null;
  author_username: string | null;
  created_at: string;
  updated_at: string | null;
  view_count: number | null;
  like_count: number | null;
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

function fmt(iso?: string | null) {
  if (!iso) return "-";
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

export default function ArchivePage() {
  const [rows, setRows] = useState<ArchivedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/archive", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? `불러오기 실패 (${res.status})`);
        setRows([]);
        return;
      }
      setErr(null);
      setRows(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  }

  async function archiveVisible() {
    if (!confirm("현재 방문자에게 보이는 자유게시판 글을 모두 보관함으로 숨길까요?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ board: "free" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "보관 처리 실패");
      setMsg(`${json.archived ?? 0}개 글을 보관함으로 옮겼습니다.`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "보관 처리 실패");
    } finally {
      setBusy(false);
    }
  }

  async function restore(id: string, title?: string | null) {
    if (!confirm(`"${title || "제목 없음"}" 글을 다시 보이게 할까요?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "복구 실패");
      setMsg("게시글을 다시 보이게 했습니다.");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "복구 실패");
    } finally {
      setBusy(false);
    }
  }

  async function restoreAll() {
    if (!confirm("보관함의 모든 글을 다시 방문자에게 보이게 할까요?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ restoreAll: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "전체 복구 실패");
      setMsg(`${json.restored ?? 0}개 글을 다시 보이게 했습니다.`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "전체 복구 실패");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="border bg-white" style={{ borderColor: "var(--border-mild)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <div className="text-[14px] font-extrabold" style={{ color: "var(--text-primary)" }}>보관함</div>
          <div className="mt-0.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
            보관된 글은 방문자에게 삭제된 글처럼 보이지 않습니다. 관리자만 복구할 수 있습니다.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className="btn-secondary px-3 py-2 text-[12px]" disabled={loading || busy}>
            새로고침
          </button>
          <button type="button" onClick={archiveVisible} className="btn-primary px-3 py-2 text-[12px]" disabled={loading || busy}>
            현재 글 모두 보관
          </button>
          <button type="button" onClick={restoreAll} className="btn-secondary px-3 py-2 text-[12px]" disabled={loading || busy || rows.length === 0}>
            전체 복구
          </button>
        </div>
      </div>

      {err ? <div className="px-4 py-3 text-[12px] text-rose-700">{err}</div> : null}
      {msg ? <div className="px-4 py-3 text-[12px] text-emerald-700">{msg}</div> : null}

      {loading ? (
        <div className="px-4 py-6 text-[12px]" style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6 text-[12px]" style={{ color: "var(--text-secondary)" }}>보관된 게시글이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left whitespace-nowrap">보관시간</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">작성자</th>
                <th className="px-3 py-2 text-left">제목</th>
                <th className="px-3 py-2 text-left">내용</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">통계</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700">{fmt(r.updated_at)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{r.author_username ?? "알수없음"}</div>
                    <div className="text-[10px] text-slate-500">{shortId(r.author_id)}</div>
                  </td>
                  <td className="px-3 py-2 min-w-[180px]">
                    <div className="font-semibold text-slate-900 break-words">{r.title ?? "(제목 없음)"}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{shortId(r.id)}</div>
                  </td>
                  <td className="px-3 py-2 min-w-[280px]">
                    <div className="line-clamp-4 whitespace-pre-wrap break-words text-slate-800">{r.content ?? ""}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                    조회 {r.view_count ?? 0}<br />좋아요 {r.like_count ?? 0}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => restore(r.id, r.title)}
                        className="border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 hover:bg-slate-50"
                        disabled={busy}
                      >
                        복구
                      </button>
                      <Link
                        href={`/community/free/${r.id}`}
                        className="border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        보기
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
