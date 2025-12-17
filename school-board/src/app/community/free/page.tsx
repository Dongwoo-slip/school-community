"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Poll = { question?: string; options?: { id: string; text: string }[] };

type Post = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
  poll?: Poll | null;
  author?: { username: string | null; role: string | null };
};

type Me = { userId: string | null; role: string; username: string | null };

function VisitorsBox({ count }: { count: number | null }) {
  return (
    <div className="mt-3 border border-slate-600/80 bg-white p-2.5 text-center">
      <div className="text-[11px] font-medium text-slate-600">누적 방문수</div>
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
    <span className="inline-flex items-center justify-center bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-400/40">
      공지
    </span>
  );
}

function FullBleed({ children }: { children: React.ReactNode }) {
  return <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">{children}</div>;
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
    setMe({ userId: json.userId ?? null, role: json.role ?? "guest", username: json.username ?? null });
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

  const orderedPosts = useMemo(() => {
    const admin = posts.filter((p) => p.author?.role === "admin");
    const normal = posts.filter((p) => p.author?.role !== "admin");
    admin.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    normal.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return [...admin, ...normal];
  }, [posts]);

  const numberMap = useMemo(() => {
    const normal = posts
      .filter((p) => p.author?.role !== "admin")
      .filter((p) => typeof p.id === "string" && p.id.length > 0);

    normal.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const map = new Map<string, number>();
    normal.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }, [posts]);

  const top3 = useMemo(() => {
    const arr = [...posts].filter((p) => typeof p.id === "string" && p.id.length > 0);
    arr.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    return arr.slice(0, 3);
  }, [posts]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-5">
      {/* 상단: 로고 + (작은)자유게시판 + 로그인정보 + 버튼 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* ✅ 로고(886x282): 전체 보이게 object-contain + 큰 max-width */}
          <img
            src="/logo.png"
            alt="logo"
            className="h-10 sm:h-12 md:h-14 w-auto object-contain max-w-[360px] sm:max-w-[460px] md:max-w-[520px]"
          />
          <div className="mt-1 text-[12px] font-bold text-slate-900">자유게시판</div>
        </div>

        <div className="flex items-start gap-2">
          {/* 로그인 표시를 약간 더 오른쪽 느낌(버튼쪽에 붙임) */}
          <div className="hidden sm:block text-right text-[12px] text-slate-600 pt-1 mr-2">
            {me.userId ? (
              <>
                로그인: <span className="font-semibold text-emerald-700">{me.username ?? "unknown"}</span>
                {me.role === "admin" ? <span className="ml-1 font-semibold text-amber-700">★</span> : null}
              </>
            ) : (
              "로그인되지 않음"
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!me.userId ? (
              <>
                <Link className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50" href="/login?next=/community/free">
                  로그인
                </Link>
                <Link className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50" href="/signup">
                  회원가입
                </Link>
              </>
            ) : (
              <button type="button" onClick={onLogout} className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50">
                로그아웃
              </button>
            )}

            <Link className="border border-emerald-400 bg-emerald-300 px-2 py-1 text-[11px] font-semibold text-black hover:bg-emerald-200" href="/community/free/new">
              글쓰기
            </Link>
          </div>
        </div>
      </div>

      {/* 항목란 */}
      <div className="mt-3">
        <FullBleed>
          <div className="border-t-2 border-b-2 border-sky-700 bg-white">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <div className="flex items-center gap-2 py-2">
                <button className="border border-sky-700 bg-sky-700 px-3 py-1 text-[12px] font-semibold text-white hover:bg-sky-600">전체글</button>
                <button className="border border-slate-300 bg-white px-3 py-1 text-[12px] font-semibold text-slate-800 hover:bg-slate-50">공지</button>
                <button className="border border-slate-300 bg-white px-3 py-1 text-[12px] font-semibold text-slate-800 hover:bg-slate-50">인기글</button>
                <div className="ml-auto text-[12px] text-slate-500">정렬/필터 자리</div>
              </div>
            </div>
          </div>
        </FullBleed>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        {/* 게시글 영역 */}
        <section className="md:col-span-7 lg:col-span-8 md:max-w-[560px] md:justify-self-start">
          {/* 배너(네가 문구 넣을 자리) */}
          <div className="mb-4 border border-sky-700 bg-white">
            <div className="border-b border-sky-700 bg-sky-50 px-4 py-2 text-[12px] font-semibold text-sky-900">
              사이트 배너
            </div>
            <div className="px-4 py-6">
              <div className="text-[15px] font-extrabold text-slate-900">여기에 설명/공지 문구</div>
              <div className="mt-1 text-[12px] text-slate-600">원하는 문구로 바꿔서 쓰면 됨</div>
            </div>
          </div>

          {loading ? (
            <div className="text-slate-600 text-sm">불러오는 중…</div>
          ) : orderedPosts.length === 0 ? (
            <div className="border border-slate-300 bg-white p-4 text-slate-700 text-sm">아직 글이 없습니다.</div>
          ) : (
            <div className="overflow-hidden border border-slate-400 bg-white">
              <div className="border-b border-slate-400 bg-white">
                <div className="grid grid-cols-12 items-center px-3 py-2 text-[11px] font-semibold text-slate-900">
                  <div className="col-span-2">번호</div>
                  <div className="col-span-6 sm:col-span-5">제목</div>
                  <div className="hidden sm:block sm:col-span-2">글쓴이</div>
                  <div className="col-span-2 sm:col-span-2 text-right">작성일</div>
                  <div className="col-span-2 sm:col-span-1 text-right">조회</div>
                </div>
              </div>

              <ul className="divide-y divide-slate-200">
                {orderedPosts.map((p) => {
                  const isAdmin = p.author?.role === "admin";
                  const idOk = typeof p.id === "string" && p.id.length > 0;
                  const href = idOk ? `/community/free/${encodeURIComponent(p.id)}` : "/community/free";
                  const num = !isAdmin && idOk ? numberMap.get(p.id) : undefined;

                  const username = p.author?.username ?? "unknown";
                  const date = fmtCompactDate(p.created_at);

                  const hasPoll = !!p.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2;

                  return (
                    <li key={p.id ?? crypto.randomUUID()} className={isAdmin ? "bg-amber-50" : "hover:bg-slate-50"}>
                      <div className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm">
                        <div className="col-span-2 text-[12px] text-slate-900">
                          {isAdmin ? (
                            <NoticeBadge />
                          ) : (
                            <span className="inline-flex min-w-8 items-center justify-center border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800">
                              {typeof num === "number" ? num : "-"}
                            </span>
                          )}
                        </div>

                        <div className="col-span-6 sm:col-span-5 min-w-0">
                          <Link
                            href={href}
                            className={"block min-w-0 truncate font-medium " + (isAdmin ? "text-amber-800" : "text-slate-900")}
                            title={p.title}
                          >
                            {p.title}{" "}
                            {/* ✅ 제목 끝에 [조회수] 빨간색 + 투표 있으면 🗳️ */}
                            <span className="ml-1 font-semibold text-rose-600">[{p.view_count ?? 0}]</span>
                            {hasPoll ? <span className="ml-1">🗳️</span> : null}
                          </Link>
                        </div>

                        <div className="hidden sm:block sm:col-span-2 min-w-0 truncate text-slate-800 text-[12px]">
                          {username}
                          {isAdmin ? <span className="ml-1 text-amber-600 font-semibold">★</span> : null}
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
        </section>

        {/* 인기글 */}
        <aside className="hidden md:block md:col-span-5 lg:col-span-4 md:max-w-[360px] md:justify-self-end">
          <div className="sticky top-6 border border-slate-300 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900">🔥 인기글 TOP 3</span>
              <span className="text-sm text-slate-500">(조회수)</span>
            </div>

            {loading ? (
              <div className="text-slate-500">불러오는 중…</div>
            ) : top3.length === 0 ? (
              <div className="text-slate-500">아직 데이터가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {top3.map((p, idx) => (
                  <li key={p.id}>
                    <Link href={`/community/free/${encodeURIComponent(p.id)}`} className="block border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate font-semibold text-[13px] text-slate-900">#{idx + 1} {p.title}</div>
                        <div className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap">조회 {p.view_count}</div>
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
