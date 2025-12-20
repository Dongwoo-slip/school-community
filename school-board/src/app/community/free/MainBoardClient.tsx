"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFreeBoard } from "./layout";

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

function SectionTitle({ title, right }: { title: string; right?: string }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-2">
      <div className="text-[13px] font-semibold text-slate-900">{title}</div>
      {right ? <div className="text-[11px] text-slate-500">{right}</div> : null}
    </div>
  );
}

type AnyPost = any;

function ListBox({
  mode,
  posts,
  emptyText,
  criteriaHint,
}: {
  mode: "notice" | "best";
  posts: AnyPost[];
  emptyText: string;
  criteriaHint?: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="border border-slate-300 bg-white p-4 text-slate-700 text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-slate-400 bg-white">
      <div className="border-b border-slate-400 bg-white">
        <div className="grid grid-cols-12 items-center px-3 py-2 text-[11px] font-semibold text-slate-900">
          <div className="col-span-2">{mode === "best" ? "순위" : "구분"}</div>
          <div className="col-span-7 sm:col-span-8">제목</div>
          <div className="col-span-3 sm:col-span-2 text-right">작성일</div>
        </div>
      </div>

      <ul className="divide-y divide-slate-200">
        {posts.map((p: AnyPost, idx: number) => {
          const href = `/community/free/${encodeURIComponent(p.id)}`;
          const date = fmtCompactDate(p.created_at);

          const isNotice = p.author?.role === "admin";
          const likeCount = Number(p.like_count ?? 0);
          const viewCount = Number(p.view_count ?? 0);

          return (
            <li
              key={p.id}
              className={
                isNotice ? "bg-amber-50 hover:bg-amber-50/70" : "hover:bg-slate-50"
              }
            >
              <div className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm">
                <div className="col-span-2">
                  {mode === "best" ? (
                    <span className="inline-flex min-w-8 items-center justify-center border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800">
                      #{idx + 1}
                    </span>
                  ) : (
                    <NoticeBadge />
                  )}
                </div>

                <div className="col-span-7 sm:col-span-8 min-w-0">
                  <Link
                    href={href}
                    className={
                      "block truncate font-semibold " +
                      (isNotice ? "text-amber-800" : "text-slate-900")
                    }
                    title={p.title}
                  >
                    {p.title}
                    <span className="ml-2 text-[11px] font-semibold text-slate-500">
                      {likeCount > 0 ? `좋아요 ${likeCount}` : null}
                      {likeCount > 0 ? " · " : null}
                      조회 {viewCount}
                      {criteriaHint ? <span className="ml-2">{criteriaHint}</span> : null}
                    </span>
                  </Link>
                </div>

                <div className="col-span-3 sm:col-span-2 text-right text-[12px] text-slate-700">
                  {date}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MainBoardClient() {
  const { loading, orderedPosts, query } = useFreeBoard();
  const q = query.trim().toLowerCase();

  // ✅ 공지(=admin 글)
  const notices = useMemo(() => {
    const adminOnly = orderedPosts.filter((p: AnyPost) => p.author?.role === "admin");
    if (!q) return adminOnly;
    return adminOnly.filter((p: AnyPost) => (p.title ?? "").toLowerCase().includes(q));
  }, [orderedPosts, q]);

  // ✅ 인기글 Top5: (좋아요 10↑ OR 조회 50↑)
  // - 조건 만족 글이 0개면: 조회수 Top5라도 보여줌(“아예 안보임” 방지)
  const bestTop5 = useMemo(() => {
    const normal = orderedPosts.filter((p: AnyPost) => p.author?.role !== "admin");

    const filtered = !q
      ? normal
      : normal.filter((p: AnyPost) => (p.title ?? "").toLowerCase().includes(q));

    const byScoreDesc = (a: AnyPost, b: AnyPost) => {
      const al = Number(a.like_count ?? 0);
      const bl = Number(b.like_count ?? 0);
      if (bl !== al) return bl - al;

      const av = Number(a.view_count ?? 0);
      const bv = Number(b.view_count ?? 0);
      if (bv !== av) return bv - av;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };

    const candidates = filtered.filter((p: AnyPost) => {
      const likeCount = Number(p.like_count ?? 0);
      const viewCount = Number(p.view_count ?? 0);
      return likeCount >= 10 || viewCount >= 50;
    });

    if (candidates.length > 0) {
      return [...candidates].sort(byScoreDesc).slice(0, 5);
    }

    // ✅ 조건 만족 글이 하나도 없으면: 조회/좋아요 기준으로 그냥 Top5 표시
    return [...filtered].sort(byScoreDesc).slice(0, 5);
  }, [orderedPosts, q]);

  const hasQualifiedBest = useMemo(() => {
    return bestTop5.some((p: AnyPost) => Number(p.like_count ?? 0) >= 10 || Number(p.view_count ?? 0) >= 50);
  }, [bestTop5]);

  return (
    <>
      {/* 배너 */}
      <div className="mb-4 border-y-2 border-sky-700 bg-white">
        <div className="border-b border-sky-700 bg-sky-50 px-4 py-2 text-[12px] font-semibold text-sky-900">
          CheongJu High School Community - CONNECT
        </div>

        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="min-w-0 flex-1">
              <div className="w-full overflow-hidden border border-slate-300 bg-slate-100">
                <img
                  src="/imagebanner.jpg"
                  alt="imagebanner"
                  className="h-[150px] w-full object-cover sm:h-[180px]"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="md:w-[260px] md:shrink-0 md:border-l md:border-slate-200 md:pl-4">
              <div className="text-[12px] font-bold text-slate-900">문의 이메일</div>
              <div className="mt-1 text-[12px] text-slate-700">
                <a
                  href="mailto:ryudongu17@gmail.com"
                  className="text-sky-700 underline underline-offset-2"
                >
                  ryudongu17@gmail.com
                </a>
              </div>

              <div className="mt-2 text-[12px] text-slate-600">
                운영팀: <span className="font-semibold text-slate-900">모든 관리자 계정</span>
              </div>

              <button className="mt-3 w-full border border-sky-100 bg-sky-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-sky-600">
                공지 보기 (자리)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인: 공지 아래에 인기글(탭 없이) */}
      {loading ? (
        <div className="text-slate-600 text-sm">불러오는 중…</div>
      ) : (
        <>
          <SectionTitle title="공지" />
          <div className="mb-6">
            <ListBox
              mode="notice"
              posts={notices}
              emptyText={query.trim() ? "검색 결과가 없습니다." : "공지 글이 없습니다."}
            />
          </div>

          <SectionTitle
            title="인기글 TOP 5"
            right="기준: 좋아요 10↑ 또는 조회 50↑"
          />
          <div>
            <ListBox
              mode="best"
              posts={bestTop5}
              emptyText={query.trim() ? "검색 결과가 없습니다." : "인기글이 아직 없습니다."}
              criteriaHint={!hasQualifiedBest ? "(조건 만족 글 없음 → 상위 5개 임시 표시)" : undefined}
            />
          </div>
        </>
      )}
    </>
  );
}
