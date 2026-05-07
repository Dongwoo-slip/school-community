"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTier } from "@/lib/tiers";

type Poll = { question?: string; options?: { id: string; text: string }[] };

type Row = {
  id: string;
  title: string | null;
  created_at: string;
  view_count: number | null;
  like_count: number | null;
  poll?: Poll | null;
  author?: { username: string | null; role: string | null; points?: number };
};

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
  }, []);

  return (
    <div className="space-y-6">
      {/* Criteria Highlight */}
      <div className="glass flex items-center gap-4 rounded-2xl bg-white/[0.03] p-4 text-xs font-bold text-slate-400">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-lg">💡</span>
        <div>
          <p className="text-white">베스트 게시글 선정 기준</p>
          <p className="mt-0.5 opacity-60">
            좋아요 <span className="text-rose-400">{likeTh}개</span> 이상 또는 조회{" "}
            <span className="text-sky-400">{viewTh}회</span> 이상
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-[2rem] p-12 text-center">
          <div className="text-4xl mb-4">🌪️</div>
          <p className="text-sm font-medium text-slate-500">조건을 만족하는 베스트 게시글이 아직 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((p, idx) => {
            const date = new Date(p.created_at).toLocaleDateString();
            const hasPoll = !!p.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2;

            return (
              <Link
                key={p.id}
                href={`/community/free/${p.id}`}
                className="glass-hover group flex items-center gap-6 rounded-2xl bg-white/[0.03] p-5 transition-all hover:bg-white/10"
              >
                {/* Ranking Index */}
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-500/10 font-bold text-amber-500 ring-1 ring-amber-500/20">
                  <span className="text-[10px] opacity-60 leading-none mb-0.5">BEST</span>
                  <span className="text-xs">{String(idx + 1).padStart(2, '0')}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-bold text-slate-200 group-hover:text-sky-400 transition-colors">
                      {p.title}
                    </h3>
                    {hasPoll && <span className="text-xs" title="투표 포함">🗳️</span>}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest leading-none">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      {(() => {
                        const t = getTier(p.author?.points || 0, p.author?.role || undefined);
                        return (
                          <>
                            <span title={t.name}>{t.icon}</span>
                            <span className={t.color}>{p.author?.username || "익명"}</span>
                            {p.author?.role === "admin" && (
                              <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
                                Admin
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span className="flex items-center gap-1">👀 {p.view_count} VIEW</span>
                      <span className="flex items-center gap-1 text-rose-400">❤️ {p.like_count} LIKE</span>
                      <span className="opacity-40">{date}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block text-slate-700 group-hover:text-sky-400 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
