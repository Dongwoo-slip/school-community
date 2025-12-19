"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Poll = { question?: string; options?: { id: string; text: string }[] };

type Row = {
  id: string;
  title: string | null;
  created_at: string;
  view_count: number | null;
  like_count: number | null;
  poll?: Poll | null;
  author?: { username: string | null; role: string | null };
};

function fmtCompactDate(iso: string) {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}/${mm}/${dd}`;
}

function NoticeBadge() {
  return (
    <span className="inline-flex items-center justify-center bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-400/40">
      공지
    </span>
  );
}

export default function BestPostsClient() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [likeTh, setLikeTh] = useState(10);
  const [viewTh, setViewTh] = useState(50);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/best`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setRows(Array.isArray(json.data) ? json.data : []);
      setLikeTh(typeof json.likeThreshold === "number" ? json.likeThreshold : 10);
      setViewTh(typeof json.viewThreshold === "number" ? json.viewThreshold : 50);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => rows, [rows]);

  return (
    <>
      <div className="mb-3 border border-slate-300 bg-white p-3 text-[12px] text-slate-700">
        개념글 기준: <span className="font-semibold">좋아요 {likeTh}개 이상</span> 또는{" "}
        <span className="font-semibold">조회 {viewTh}회 이상</span>
      </div>

      {loading ? (
        <div className="text-slate-600 text-sm">불러오는 중…</div>
      ) : list.length === 0 ? (
        <div className="border border-slate-300 bg-white p-4 text-slate-700 text-sm">
          조건을 만족하는 글이 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-400 bg-white">
          {/* 헤더 */}
          <div className="border-b border-slate-300 bg-slate-50">
            <div
              className={[
                "grid items-center px-3 py-2 text-[11px] font-semibold text-slate-900",
                // ✅ 폭 고정: 번호 / 제목 / 작성자 / 좋아요 / 조회 / 작성일
                "grid-cols-[56px_1fr_120px_84px_84px_96px]",
                "gap-2",
              ].join(" ")}
            >
              <div className="text-center">번호</div>
              <div>제목</div>
              <div className="hidden sm:block">작성자</div>
              <div className="text-right tabular-nums">좋아요</div>
              <div className="text-right tabular-nums">조회</div>
              <div className="hidden sm:block text-right">작성일</div>
            </div>
          </div>

          {/* 목록 */}
          <ul className="divide-y divide-slate-200">
            {list.map((p, idx) => {
              const isAdmin = p.author?.role === "admin";
              const href = `/community/free/${encodeURIComponent(p.id)}`;
              const date = fmtCompactDate(p.created_at);
              const hasPoll = !!p.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2;

              return (
                <li key={p.id} className={isAdmin ? "bg-amber-50" : "hover:bg-slate-50"}>
                  <div
                    className={[
                      "grid items-center px-3 py-2.5 text-[13px] text-slate-900",
                      "grid-cols-[56px_1fr_120px_84px_84px_96px]",
                      "gap-2",
                    ].join(" ")}
                  >
                    {/* 번호 */}
                    <div className="text-center">
                      {isAdmin ? (
                        <NoticeBadge />
                      ) : (
                        <span className="inline-flex w-[44px] justify-center border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 tabular-nums">
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* 제목 */}
                    <div className="min-w-0">
                      <Link
                        href={href}
                        className="block truncate font-medium text-slate-900 hover:underline"
                        title={p.title ?? ""}
                      >
                        {p.title ?? "(제목 없음)"}
                        {hasPoll ? <span className="ml-1">🗳️</span> : null}
                      </Link>
                    </div>

                    {/* 작성자 */}
                    <div className="hidden sm:block min-w-0 truncate text-[12px] text-slate-700">
                      {p.author?.username ?? "unknown"}
                      {isAdmin ? <span className="ml-1 text-amber-600 font-semibold">★</span> : null}
                    </div>

                    {/* 좋아요 */}
                    <div className="text-right text-[12px] text-slate-700 tabular-nums">
                      👍 {p.like_count ?? 0}
                    </div>

                    {/* 조회 */}
                    <div className="text-right text-[12px] text-slate-700 tabular-nums">
                      {p.view_count ?? 0}
                    </div>

                    {/* 작성일 */}
                    <div className="hidden sm:block text-right text-[12px] text-slate-600 tabular-nums">
                      {date}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
