"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Post = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
  author?: { username: string | null; role: string | null };
};

type Me = { userId: string | null; role: string; username: string | null };

function VisitorsBox({ count }: { count: number | null }) {
  return (
    <div className="mt-2 rounded-xl border border-black/15 bg-white p-2 text-center">
      <div className="text-[10px] font-medium text-slate-600">누적 방문수</div>
      <div className="mt-0.5 text-lg font-extrabold text-emerald-700">
        {count === null ? "-" : count.toLocaleString()}
      </div>
    </div>
  );
}

function fmtCompactDate(iso: string) {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}/${mm}/${dd}`;
}

function NoticeBadge() {
  return (
    <span className="inline-flex items-center justify-center rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
      공지
    </span>
  );
}

export default function FreeBoardPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<number | null>(null);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setMe({
      userId: json.userId ?? null,
      role: json.role ?? "guest",
      username: json.username ?? null,
    });
  }

  async function loadPosts() {
    setLoading(true);
    const res = await fetch("/api/posts?board=free", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setPosts(json.data ?? []);
    setLoading(false);
  }

  async function loadVisitors() {
    const res = await fetch("/api/stats/visitors", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setVisitors(typeof json.count === "number" ? json.count : 0);
  }

  async function onLogout() {
    await fetch("/logout", { method: "POST" }).catch(() => null);
    await loadMe();
    router.refresh();
  }

  useEffect(() => {
    loadMe();
    loadPosts();
    loadVisitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ admin 글 고정(공지) + 일반글은 기존 최신순 유지
  const orderedPosts = useMemo(() => {
    const admin = posts.filter((p) => p.author?.role === "admin");
    const normal = posts.filter((p) => p.author?.role !== "admin");

    admin.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return [...admin, ...normal];
  }, [posts]);

  // ✅ "옛날 글이 1" 번호 매핑(공지 제외하고 일반글만)
  const numberMap = useMemo(() => {
    const normal = posts
      .filter((p) => p.author?.role !== "admin")
      .filter((p) => typeof p.id === "string" && p.id.length > 0);

    normal.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const map = new Map<string, number>();
    normal.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }, [posts]);

  // TOP3(조회수 기준) - 그대로 유지
  const top3 = useMemo(() => {
    const arr = [...posts].filter((p) => typeof p.id === "string" && p.id.length > 0);
    arr.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    return arr.slice(0, 3);
  }, [posts]);

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
      {/* ✅ 둥근 파란 배너 (유지) */}
      <div className="relative mt-3 mb-5">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-44 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-700" />
        <div className="relative rounded-full bg-sky-900 px-4 py-4 sm:px-7 sm:py-6 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">자유게시판</h1>

              {me.userId ? (
                <div className="text-xs sm:text-sm">
                  <span className="text-white/85">로그인됨:</span>{" "}
                  <span className="font-semibold text-emerald-200">{me.username ?? "unknown"}</span>
                  {me.role === "admin" ? (
                    <span className="ml-2 font-semibold text-amber-200">★ (Admin)</span>
                  ) : null}
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-white/80">로그인되지 않음</div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {!me.userId ? (
                <>
                  <Link className="rounded-lg bg-white/15 px-2.5 py-2 text-xs sm:text-sm text-white hover:bg-white/25" href="/login?next=/community/free">
                    로그인
                  </Link>
                  <Link className="rounded-lg bg-white/15 px-2.5 py-2 text-xs sm:text-sm text-white hover:bg-white/25" href="/signup">
                    회원가입
                  </Link>
                </>
              ) : (
                <button type="button" onClick={onLogout} className="rounded-lg bg-white/15 px-2.5 py-2 text-xs sm:text-sm text-white hover:bg-white/25">
                  로그아웃
                </button>
              )}

              <Link className="rounded-lg bg-emerald-300 px-2.5 py-2 text-xs sm:text-sm font-semibold text-black hover:bg-emerald-200" href="/community/free/new">
                글쓰기
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 모바일도 “가로 2열”: 글목록(좌) + 인기글(우) */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4">
        {/* 글 목록(표) */}
        <section className="col-span-8">
          {loading ? (
            <div className="text-slate-700 text-sm">불러오는 중…</div>
          ) : orderedPosts.length === 0 ? (
            <div className="rounded-xl border border-black/15 bg-white p-4 text-slate-700 text-sm">
              아직 글이 없습니다.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-black/15 bg-white">
              {/* table header (색은 헤더만) */}
              <div className="border-b border-black/15 bg-sky-700 px-2 py-2 sm:px-3 sm:py-2.5">
                <div className="grid grid-cols-12 items-center text-[10px] sm:text-[11px] font-semibold text-white">
                  <div className="col-span-2">번호</div>
                  <div className="col-span-7 sm:col-span-6">제목</div>
                  <div className="hidden sm:block sm:col-span-2">글쓴이</div>
                  <div className="col-span-2 sm:col-span-1 text-right">작성일</div>
                  <div className="col-span-1 text-right">조회</div>
                </div>
              </div>

              {/* rows (일반글 배경 없음 + 얇은 검은 선) */}
              <ul className="divide-y divide-black/10">
                {orderedPosts.map((p) => {
                  const isAdmin = p.author?.role === "admin";
                  const idOk = typeof p.id === "string" && p.id.length > 0;
                  const href = idOk ? `/community/free/${encodeURIComponent(p.id)}` : "/community/free";
                  const num = !isAdmin && idOk ? numberMap.get(p.id) : undefined;

                  const username = p.author?.username ?? "unknown";
                  const date = fmtCompactDate(p.created_at);
                  const views = p.view_count ?? 0;

                  return (
                    <li
                      key={p.id ?? crypto.randomUUID()}
                      className={
                        "px-2 py-2 sm:px-3 sm:py-2.5 text-xs sm:text-sm " +
                        (isAdmin ? "bg-amber-50" : "")
                      }
                    >
                      <div className="grid grid-cols-12 items-center gap-2">
                        {/* 번호 */}
                        <div className="col-span-2 text-[11px] text-slate-900">
                          {isAdmin ? (
                            <NoticeBadge />
                          ) : (
                            <span className="inline-flex min-w-8 items-center justify-center rounded-md border border-black/15 bg-white px-2 py-1 text-[10px] text-slate-900">
                              {typeof num === "number" ? num : "-"}
                            </span>
                          )}
                        </div>

                        {/* 제목 + [조회수] 빨강 */}
                        <div className="col-span-7 sm:col-span-6 min-w-0">
                          <Link
                            href={href}
                            className={"block min-w-0 truncate font-medium text-slate-950 hover:underline"}
                            title={p.title}
                          >
                            <span>{p.title} </span>
                            <span className="text-red-600 font-semibold">[{views}]</span>
                          </Link>
                        </div>

                        {/* 글쓴이 */}
                        <div className="hidden sm:block sm:col-span-2 min-w-0 truncate text-slate-900 text-[12px]">
                          {username}
                          {isAdmin ? <span className="ml-1 text-amber-600 font-semibold">★</span> : null}
                        </div>

                        {/* 작성일 */}
                        <div className="col-span-2 sm:col-span-1 text-right text-[11px] text-slate-800">
                          {date}
                        </div>

                        {/* 조회 */}
                        <div className="col-span-1 text-right text-[11px] text-slate-800">
                          {views}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* 인기글(우측) - 모바일도 항상 표시 */}
        <aside className="col-span-4">
          <div className="sticky top-4 rounded-xl border border-black/15 bg-white p-2 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[12px] sm:text-base font-bold text-slate-950">🔥 인기글</span>
              <span className="text-[10px] sm:text-sm text-slate-600">(조회수)</span>
            </div>

            {loading ? (
              <div className="text-slate-600 text-xs">불러오는 중…</div>
            ) : top3.length === 0 ? (
              <div className="text-slate-600 text-xs">아직 데이터가 없습니다.</div>
            ) : (
              <ul className="space-y-1.5">
                {top3.map((p, idx) => (
                  <li key={p.id}>
                    <Link
                      href={`/community/free/${encodeURIComponent(p.id)}`}
                      className="block rounded-lg border border-black/10 bg-white px-2 py-2 hover:bg-black/[0.03]"
                    >
                      <div className="min-w-0 truncate font-semibold text-[11px] sm:text-[13px] text-slate-950">
                        #{idx + 1} {p.title}
                      </div>
                      <div className="mt-0.5 text-[10px] sm:text-xs text-slate-600">
                        조회 {p.view_count ?? 0}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <VisitorsBox count={visitors} />
          </div>
        </aside>
      </div>
    </main>
  );
}
