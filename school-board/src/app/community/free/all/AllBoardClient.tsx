"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFreeBoard } from "../layout";

function fmtCompactDate(iso: string) {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}/${mm}/${dd}`;
}

export default function AllBoardClient() {
  const { loading, orderedPosts, numberMap, query, me } = useFreeBoard();
  const sp = useSearchParams();
  const mine = sp.get("mine") === "1";

  const visiblePosts = useMemo(() => {
    // ✅ 전체글에서는 공지(=admin) 제외
    let arr = orderedPosts.filter((p) => p.author?.role !== "admin");

    // ✅ 내가 쓴 글 필터
    if (mine && me.userId) {
      arr = arr.filter((p: any) => (p?.author_id ?? null) === me.userId);
    }

    // ✅ 제목 검색
    const q = query.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((p: any) => (p.title ?? "").toLowerCase().includes(q));
  }, [orderedPosts, query, mine, me.userId]);

  return (
    <>
      {/* 배너(메인과 동일 유지) */}
      <div className="mb-4 border-y-2 border-sky-700 bg-white">
        <div className="border-b border-sky-700 bg-sky-50 px-4 py-2 text-[12px] font-semibold text-sky-900">
          CheongJu High School Community - Sqaure
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
                <a href="mailto:test for running" className="text-sky-700 underline underline-offset-2">
                  test. for running
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

      {/* ✅ 글쓰기 버튼 (전체글에서만) */}
      <div className="mb-3 flex items-center justify-end">
        <Link
          href="/community/free/new"
          className="border border-emerald-400 bg-emerald-300 px-3 py-2 text-[12px] font-semibold text-black hover:bg-emerald-200"
        >
          글쓰기
        </Link>
      </div>

      {loading ? (
        <div className="text-slate-600 text-sm">불러오는 중…</div>
      ) : visiblePosts.length === 0 ? (
        <div className="border border-slate-300 bg-white p-4 text-slate-700 text-sm">
          {mine ? "내가 쓴 글이 없습니다." : query.trim() ? "검색 결과가 없습니다." : "아직 글이 없습니다."}
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-400 bg-white">
          <div className="border-b border-slate-400 bg-white">
            <div className="grid grid-cols-12 items-center px-3 py-2 text-[11px] font-semibold text-slate-900">
              <div className="col-span-2">번호</div>
              <div className="col-span-6 sm:col-span-5">제목</div>
              <div className="hidden sm:block sm:col-span-2">작성자</div>
              <div className="col-span-2 sm:col-span-2 text-right">작성일</div>
              <div className="col-span-2 sm:col-span-1 text-right">조회</div>
            </div>
          </div>

          <ul className="divide-y divide-slate-200">
            {visiblePosts.map((p: any) => {
              const idOk = typeof p.id === "string" && p.id.length > 0;
              const href = idOk ? `/community/free/${encodeURIComponent(p.id)}` : "/community/free/all";
              const num = idOk ? numberMap.get(p.id) : undefined;

              const username = p.author?.username ?? "unknown";
              const date = fmtCompactDate(p.created_at);
              const hasPoll = !!p.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2;

              const key = idOk ? p.id : `${p.created_at ?? "x"}-${p.title ?? "y"}`;

              return (
                <li key={key} className="hover:bg-slate-50">
                  <div className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm">
                    <div className="col-span-2 text-[12px] text-slate-900">
                      <span className="inline-flex min-w-8 items-center justify-center border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800">
                        {typeof num === "number" ? num : "-"}
                      </span>
                    </div>

                    <div className="col-span-6 sm:col-span-5 min-w-0">
                      <Link href={href} className="block min-w-0 truncate font-medium text-slate-900" title={p.title}>
                        {p.title} <span className="ml-1 font-semibold text-rose-600">[{p.view_count ?? 0}]</span>
                        {hasPoll ? <span className="ml-1">🗳️</span> : null}
                      </Link>
                    </div>

                    <div className="hidden sm:block sm:col-span-2 min-w-0 truncate text-slate-800 text-[12px]">
                      {username}
                    </div>

                    <div className="col-span-2 sm:col-span-2 text-right text-[12px] text-slate-700">{date}</div>
                    <div className="col-span-2 sm:col-span-1 text-right text-[12px] text-slate-700">{p.view_count ?? 0}</div>
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
