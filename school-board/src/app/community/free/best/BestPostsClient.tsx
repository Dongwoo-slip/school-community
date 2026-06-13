"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTier } from "@/lib/tiers";
import { formatAdminStudentLabel, type AuthorIdentity } from "@/lib/authorDisplay";
import { useFreeBoard } from "../layout";

const KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
});

type Poll = { question?: string; options?: { id: string; text: string }[] };

type Row = {
  id: string;
  title: string | null;
  created_at: string;
  view_count: number | null;
  like_count: number | null;
  poll?: Poll | null;
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

export default function BestPostsClient() {
  const { me } = useFreeBoard();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/best`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      setRows(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="all-board-list overflow-hidden border border-slate-200 bg-white shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[52px] animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-500">조건을 만족하는 베스트 게시글이 아직 없습니다.</p>
        </div>
      ) : (
        <div className="all-board-list overflow-hidden border border-slate-200 bg-white shadow-sm">
          {rows.map((p, idx) => {
            const date = KST_DATE.format(new Date(p.created_at));
            const hasPoll = !!p.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2;
            const viewCount = Number(p.view_count ?? 0);
            const likeCount = Number(p.like_count ?? 0);
            const tier = getTier(p.author?.points || 0, p.author?.role || undefined);
            const authorColor = mutedTierColor(p.author?.role, p.author?.points || 0);
            const isAdmin = p.author?.role === "admin";
            const nextIsAdmin = rows[idx + 1]?.author?.role === "admin";
            const isNoticeBoundary = isAdmin && !nextIsAdmin && !!rows[idx + 1];
            const rowNo = String(idx + 1).padStart(2, "0");

            return (
              <Link
                key={p.id}
                href={`/community/free/${p.id}`}
                prefetch={false}
                className={`all-board-post-row post-row group ${isAdmin ? "notice-post-row" : ""} ${isNoticeBoundary ? "notice-post-row-last" : ""}`}
                style={{
                  background: isAdmin ? "#eef6ff" : undefined,
                  borderBottomColor: isAdmin ? "rgba(31, 126, 219, 0.12)" : undefined,
                  ...(isNoticeBoundary
                    ? {
                        borderBottom: "1px solid rgba(15, 95, 183, 0.28)",
                        boxShadow: "inset 0 -1px 0 rgba(31, 126, 219, 0.10)",
                      }
                    : {}),
                }}
              >
                <span className="all-board-row-no" style={{ color: isAdmin ? "var(--brand-light)" : "var(--text-muted)" }}>
                  {rowNo}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="post-row-title">
                    {isAdmin && (
                      <span style={{ fontSize: "0.68rem", fontWeight: 600, background: "var(--brand-dim)", color: "var(--brand-light)", borderRadius: 999, padding: "0.08rem 0.45rem", marginRight: "0.45rem" }}>
                        공지
                      </span>
                    )}
                    <span>{p.title || "제목 없음"}</span>
                    {hasPoll && (
                      <span style={{ fontSize: "0.66rem", fontWeight: 600, color: "var(--text-muted)", marginLeft: "0.4rem" }} title="투표 포함">
                        투표
                      </span>
                    )}
                  </div>

                  <div className="post-row-meta all-board-row-meta">
                    <span title={tier.name} style={{ color: authorColor }}>
                      {tier.icon} {p.author?.username || "익명"}
                    </span>
                    {me.role === "admin" && <span style={{ color: "#475569" }}>{formatAdminStudentLabel(p.author)}</span>}
                    <span>조회수 {viewCount}</span>
                    {likeCount > 0 && <span style={{ color: "var(--accent-red)" }}>좋아요 {likeCount}</span>}
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
