"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFreeBoard } from "../layout";
import { getTier } from "@/lib/tiers";

const KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
});

export default function AllBoardClient() {
  const { loading, orderedPosts, numberMap, query, me } = useFreeBoard();
  const sp = useSearchParams();
  const mine = sp.get("mine") === "1";

  const visiblePosts = useMemo(() => {
    let arr = orderedPosts;
    if (mine && me.userId) {
      arr = arr.filter((p: any) => (p?.author_id ?? null) === me.userId);
    }
    const q = query.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((p: any) => (p.title ?? "").toLowerCase().includes(q));
  }, [orderedPosts, query, mine, me.userId]);

  return (
    <div className="space-y-6">
      <div className="board-list-header">
        <div>
          <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {mine ? "내가 쓴 글" : "전체 게시글"}
          </h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {visiblePosts.length} posts found
          </p>
        </div>
        <Link href="/community/free/new" className="btn-primary py-2.5 px-6 text-sm">
          새 글 작성하기
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="glass p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-sm font-medium text-slate-500">
            {mine ? "아직 작성한 게시글이 없습니다." : "검색 결과가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visiblePosts.map((p: any) => {
            const num = numberMap.get(p.id);
            const date = KST_DATE.format(new Date(p.created_at));
            const hasPoll = !!p.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2;

            return (
              <Link
                key={p.id}
                href={`/community/free/${p.id}`}
                className="board-post-card glass-hover group flex items-center gap-6 p-5 transition-all"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="board-card-index flex h-12 w-12 shrink-0 flex-col items-center justify-center font-bold" style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid rgba(31,126,219,0.18)' }}>
                  <span className="text-[10px] leading-none mb-0.5" style={{ color: 'var(--text-muted)' }}>#{num}</span>
                  <span className="text-xs" style={{ color: 'var(--brand)' }}>{date}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="board-card-title-row flex items-center gap-2">
                    <h3 className="board-card-title truncate text-base font-bold transition-colors" style={{ color: 'var(--text-primary)' }}>
                      {p.title}
                    </h3>
                    {hasPoll && <span className="text-xs" title="투표 포함">🗳️</span>}
                  </div>
                  <div className="board-card-meta mt-2 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest leading-none">
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const t = getTier(p.author?.points || 0, p.author?.role || undefined);
                        return (
                          <>
                            <span title={t.name}>{t.icon}</span>
                            <span className={`board-card-author ${t.color}`}>{p.author?.username || "익명"}</span>
                            {p.author?.role === "admin" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ring-emerald-400/20" style={{ background: 'rgba(8,123,99,0.10)', color: 'var(--accent-mint)' }}>
                                Admin
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <span className="flex items-center gap-1">👀 {p.view_count} VIEW</span>
                    {p.like_count > 0 && <span style={{ color: 'var(--accent-red)' }}>❤️ {p.like_count} LIKE</span>}
                  </div>
                </div>

                <div className="hidden sm:block transition-colors" style={{ color: 'var(--text-muted)' }}>
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
