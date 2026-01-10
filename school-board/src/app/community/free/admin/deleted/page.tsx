"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: number;
  source_table: string;
  source_id: string;
  deleted_at: string;
  deleted_by: string | null;
  payload: any;
};

function kst(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return iso;
  }
}

function pickTitle(payload: any) {
  return payload?.title ?? payload?.subject ?? "(제목 없음)";
}

function pickContent(payload: any) {
  const c = payload?.content ?? payload?.body ?? payload?.text ?? "";
  if (typeof c !== "string") return "";
  return c.length > 800 ? c.slice(0, 800) + " …" : c;
}

export default function AdminDeletedPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/deleted?limit=80", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? `불러오기 실패 (${res.status})`);
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
        <div>
          <div className="text-[16px] font-extrabold text-slate-900">🧾 삭제된 글/댓글 로그</div>
          <div className="mt-1 text-[12px] text-slate-600">
            사용자가 삭제해도 원문이 DB에 남아서 관리자가 확인할 수 있어요.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-900 hover:bg-slate-50"
          >
            새로고침
          </button>
          <Link
            href="/community/free"
            className="border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-900 hover:bg-slate-50"
          >
            ← 메인
          </Link>
        </div>
      </div>

      {err ? <div className="mt-3 text-[12px] text-rose-600">⚠ {err}</div> : null}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="text-[12px] text-slate-600">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="text-[12px] text-slate-600">삭제 로그가 아직 없습니다. (글/댓글 하나 삭제 후 다시 확인)</div>
        ) : (
          rows.map((r) => {
            const title = pickTitle(r.payload);
            const content = pickContent(r.payload);
            const authorId = r.payload?.author_id ?? r.payload?.user_id ?? null;

            return (
              <div key={r.id} className="border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-slate-900 truncate">{title}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      원본ID: <span className="font-semibold text-slate-700">{r.source_id}</span> · 작성자ID:{" "}
                      <span className="font-semibold text-slate-700">{authorId ?? "?"}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">테이블: {r.source_table}</div>
                  </div>

                  <div className="text-right text-[11px] text-slate-500">
                    <div>삭제시각: {kst(r.deleted_at)}</div>
                    <div>삭제자: {r.deleted_by ?? "알 수 없음"}</div>
                  </div>
                </div>

                {content ? (
                  <div className="mt-2 whitespace-pre-wrap break-words text-[12px] text-slate-800">{content}</div>
                ) : (
                  <div className="mt-2 text-[12px] text-slate-500">(내용 컬럼명이 다르면 payload에서 content가 안 보일 수 있어요)</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
