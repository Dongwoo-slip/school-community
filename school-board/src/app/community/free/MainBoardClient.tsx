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

export default function MainBoardClient() {
  const { loading, orderedPosts, query } = useFreeBoard();

  // ✅ 메인에서는 공지(=admin 글)만
  const notices = useMemo(() => {
    const adminOnly = orderedPosts.filter((p) => p.author?.role === "admin");
    const q = query.trim().toLowerCase();
    if (!q) return adminOnly;
    return adminOnly.filter((p) => (p.title ?? "").toLowerCase().includes(q));
  }, [orderedPosts, query]);

  return (
    <>
      {/* 배너(기존 유지) */}
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
                <a href="mailto:ryudongu17@gmail.com" className="text-sky-700 underline underline-offset-2">
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

      {/* ✅ 메인: 글쓰기 버튼 없음 */}

      {/* 공지 목록 */}
      {loading ? (
        <div className="text-slate-600 text-sm">불러오는 중…</div>
      ) : notices.length === 0 ? (
        <div className="border border-slate-300 bg-white p-4 text-slate-700 text-sm">
          {query.trim() ? "검색 결과가 없습니다." : "공지 글이 없습니다."}
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-400 bg-white">
          <div className="border-b border-slate-400 bg-white">
            <div className="grid grid-cols-12 items-center px-3 py-2 text-[11px] font-semibold text-slate-900">
              <div className="col-span-2">구분</div>
              <div className="col-span-7">제목</div>
              <div className="col-span-3 text-right">작성일</div>
            </div>
          </div>

          <ul className="divide-y divide-slate-200">
            {notices.map((p) => {
              const href = `/community/free/${encodeURIComponent(p.id)}`;
              const date = fmtCompactDate(p.created_at);
              const hasPoll = !!p.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2;

              return (
                <li key={p.id} className="bg-amber-50 hover:bg-amber-50/70">
                  <div className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm">
                    <div className="col-span-2">
                      <NoticeBadge />
                    </div>
                    <div className="col-span-7 min-w-0">
                      <Link href={href} className="block truncate font-semibold text-amber-800" title={p.title}>
                        {p.title} <span className="ml-1 font-semibold text-rose-600">[{p.view_count ?? 0}]</span>
                        {hasPoll ? <span className="ml-1">🗳️</span> : null}
                      </Link>
                    </div>
                    <div className="col-span-3 text-right text-[12px] text-slate-700">{date}</div>
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
