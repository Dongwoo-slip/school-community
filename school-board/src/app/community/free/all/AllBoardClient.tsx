"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFreeBoard } from "../layout";

/* ✅ KST 고정(SSR/CSR 흔들림 예방) */
const KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
});

function fmtCompactDate(iso: string) {
  try {
    const parts = KST_DATE.formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const yy = get("year");
    const mm = get("month");
    const dd = get("day");
    return `${yy}/${mm}/${dd}`;
  } catch {
    return "";
  }
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
      {/* ✅ 배너는 이제 layout.tsx에서 공통으로만 렌더합니다. */}

      {/* 글쓰기 버튼 */}
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

                    <div className="col-span-2 sm:col-span-2 text-right text-[12px] text-slate-700">
                      {date}
                    </div>
                    <div className="col-span-2 sm:col-span-1 text-right text-[12px] text-slate-700">
                      {p.view_count ?? 0}
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
