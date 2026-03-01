"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFreeBoard } from "../layout";

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
    let arr = orderedPosts.filter((p) => p.author?.role !== "admin");
    if (mine && me.userId) {
      arr = arr.filter((p: any) => (p?.author_id ?? null) === me.userId);
    }
    const q = query.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((p: any) => (p.title ?? "").toLowerCase().includes(q));
  }, [orderedPosts, query, mine, me.userId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">
            {mine ? "내가 쓴 글" : "전체 게시글"}
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">
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
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="glass rounded-[2rem] p-12 text-center">
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
                className="glass-hover group flex items-center gap-6 rounded-2xl bg-white/[0.03] p-5 transition-all hover:bg-white/10"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-500/10 font-bold text-sky-400">
                  <span className="text-[10px] text-slate-500 leading-none mb-0.5">#{num}</span>
                  <span className="text-xs">{date}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-bold text-slate-200 group-hover:text-sky-400">
                      {p.title}
                    </h3>
                    {hasPoll && <span className="text-xs" title="투표 포함">🗳️</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <span>{p.author?.username || "익명"}</span>
                    <span className="flex items-center gap-1">👀 {p.view_count} VIEW</span>
                    {p.like_count > 0 && <span className="text-rose-400">❤️ {p.like_count} LIKE</span>}
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
