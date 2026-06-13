"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFreeBoard } from "../layout";
import { getTier } from "@/lib/tiers";
import { formatAdminStudentLabel, type AuthorIdentity } from "@/lib/authorDisplay";

const KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
});

type BoardPost = {
  id: string;
  title?: string | null;
  created_at: string;
  view_count?: number | null;
  like_count?: number | null;
  author_id?: string | null;
  poll?: { options?: { id: string; text: string }[] } | null;
  author?: AuthorIdentity | null;
};

function mutedTierColor(role?: string | null, points = 0) {
  if (role === "admin") return "#1d4f91";
  const tier = getTier(points, role ?? undefined);

  switch (tier.name) {
    case "뉴비":
      return "#64748b";
    case "브론즈":
      return "#7a5835";
    case "실버":
      return "#687482";
    case "골드":
      return "#7a6518";
    case "플래티넘":
      return "#3f6f60";
    case "다이아몬드":
      return "#41657e";
    case "마스터":
      return "#7b4650";
    default:
      return "#526174";
  }
}

export default function AllBoardClient() {
  const { loading, orderedPosts, numberMap, query, me } = useFreeBoard();
  const sp = useSearchParams();
  const mine = sp.get("mine") === "1";
  const [archivedCount, setArchivedCount] = useState<number | null>(null);

  const visiblePosts = useMemo(() => {
    let arr = orderedPosts;
    if (mine && me.userId) {
      arr = arr.filter((p: BoardPost) => (p?.author_id ?? null) === me.userId);
    }
    const q = query.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((p: BoardPost) => (p.title ?? "").toLowerCase().includes(q));
  }, [orderedPosts, query, mine, me.userId]);

  useEffect(() => {
    let alive = true;
    async function loadArchivedCount() {
      if (me.role !== "admin") {
        setArchivedCount(null);
        return;
      }
      const res = await fetch("/api/admin/archive", { cache: "no-store", credentials: "include" }).catch(() => null);
      const json = await res?.json().catch(() => ({}));
      if (!alive) return;
      setArchivedCount(Array.isArray(json?.data) ? json.data.length : null);
    }
    loadArchivedCount();
    return () => {
      alive = false;
    };
  }, [me.role]);

  return (
    <div className="space-y-4">
      <div className="board-list-header">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {mine ? "내가 쓴 글" : "전체 게시글"}
          </h2>
          <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {visiblePosts.length} posts found
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/community/free/new" className="btn-primary py-2.5 px-6 text-sm">
            새 글 작성하기
          </Link>
          {me.role === "admin" ? (
            <span className="inline-flex min-h-[2.55rem] items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600">
              숨김 처리된 글{" "}
              <strong className="ml-1 font-semibold text-slate-950">
                {archivedCount === null ? "-" : archivedCount.toLocaleString()}개
              </strong>
            </span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="glass p-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 border border-slate-300 bg-slate-50" />
          <p className="text-sm font-medium text-slate-500">
            {mine ? "아직 작성한 게시글이 없습니다." : "검색 결과가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="all-board-list overflow-hidden border border-slate-200 bg-white shadow-sm">
          {visiblePosts.map((p: BoardPost, idx: number) => {
            const num = numberMap.get(p.id);
            const date = KST_DATE.format(new Date(p.created_at));
            const hasPoll = !!p.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2;
            const viewCount = Number(p.view_count ?? 0);
            const likeCount = Number(p.like_count ?? 0);
            const tier = getTier(p.author?.points || 0, p.author?.role || undefined);
            const authorColor = mutedTierColor(p.author?.role, p.author?.points || 0);
            const isAdmin = p.author?.role === "admin";
            const nextIsAdmin = visiblePosts[idx + 1]?.author?.role === "admin";
            const isNoticeBoundary = isAdmin && !nextIsAdmin && !!visiblePosts[idx + 1];
            const rowNo = typeof num === "number" ? String(num).padStart(2, "0") : String(idx + 1).padStart(2, "0");

            return (
              <Link
                key={p.id}
                href={`/community/free/${p.id}`}
                prefetch={false}
                className={`all-board-post-row post-row group ${isAdmin ? "notice-post-row" : ""} ${isNoticeBoundary ? "notice-post-row-last" : ""}`}
                style={{
                  background: isAdmin ? '#eef6ff' : undefined,
                  borderBottomColor: isAdmin ? 'rgba(31, 126, 219, 0.12)' : undefined,
                  ...(isNoticeBoundary ? {
                    borderBottom: '1px solid rgba(15, 95, 183, 0.28)',
                    boxShadow: 'inset 0 -1px 0 rgba(31, 126, 219, 0.10)',
                  } : {}),
                }}
              >
                <span className="all-board-row-no" style={{ color: isAdmin ? 'var(--brand-light)' : 'var(--text-muted)' }}>
                  {rowNo}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="post-row-title">
                    {isAdmin && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, background: 'var(--brand-dim)', color: 'var(--brand-light)', borderRadius: 999, padding: '0.08rem 0.45rem', marginRight: '0.45rem' }}>
                        공지
                      </span>
                    )}
                    <span>
                      {p.title}
                    </span>
                    {hasPoll && <span className="text-[11px]" title="투표 포함">🗳️</span>}
                  </div>
                  <div className="post-row-meta all-board-row-meta">
                    <span title={tier.name} style={{ color: authorColor }}>{tier.icon} {p.author?.username || "익명"}</span>
                    {me.role === "admin" && (
                      <span style={{ color: '#475569' }}>
                        {formatAdminStudentLabel(p.author)}
                      </span>
                    )}
                    <span>조회수 {viewCount}</span>
                    {likeCount > 0 && <span style={{ color: 'var(--accent-red)' }}>좋아요 {likeCount}</span>}
                    <span>{date}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
