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

/** ✅ 화면 양쪽 끝까지 “쫙” 펴지는 바(풀-블리드) */
function FullBleed({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
      {children}
    </div>
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

  // ✅ admin 글 고정(공지) + 일반글 최신순
  const orderedPosts = useMemo(() => {
    const admin = posts.filter((p) => p.author?.role === "admin");
    const normal = posts.filter((p) => p.author?.role !== "admin");

    admin.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    normal.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return [...admin, ...normal];
  }, [posts]);

  // ✅ "옛날 글이 1" 번호 매핑(공지 제외 일반글만)
  const numberMap = useMemo(() => {
    const normal = posts
      .filter((p) => p.author?.role !== "admin")
      .filter((p) => typeof p.id === "string" && p.id.length > 0);

    normal.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const map = new Map<string, number>();
    normal.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }, [posts]);

  // TOP3(조회수 기준)
  const top3 = useMemo(() => {
    const arr = [...posts].filter((p) => typeof p.id === "string" && p.id.length > 0);
    arr.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    return arr.slice(0, 3);
  }, [posts]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-5">
      {/* ✅ 1) “자유게시판” 제목: 배경 없이 글자만 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900">자유게시판</h1>
          {me.userId ? (
            <div className="mt-1 text-[12px] text-slate-600">
              로그인: <span className="font-semibold text-emerald-700">{me.username ?? "unknown"}</span>
              {me.role === "admin" ? <span className="ml-1 font-semibold text-amber-700">★ (Admin)</span> : null}
            </div>
          ) : (
            <div className="mt-1 text-[12px] text-slate-500">로그인되지 않음</div>
          )}
        </div>

        {/* ✅ 2) 버튼들: 작게 + 맨위 느낌(붙어있게) */}
        <div className="flex items-center gap-1.5">
          {!me.userId ? (
            <>
              <Link
                className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50"
                href="/login?next=/community/free"
              >
                로그인
              </Link>
              <Link
                className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50"
                href="/signup"
              >
                회원가입
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50"
            >
              로그아웃
            </button>
          )}

          <Link
            className="border border-emerald-400 bg-emerald-300 px-2 py-1 text-[11px] font-semibold text-black hover:bg-emerald-200"
            href="/community/free/new"
          >
            글쓰기
          </Link>
        </div>
      </div>

      {/* ✅ 3) “항목란(탭 바)” : 파란색 바를 아래로 내리고, 화면 양끝까지 풀로 */}
      <div className="mt-3">
        <FullBleed>
          <div className="border-t-2 border-b-2 border-sky-700 bg-white">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <div className="flex items-center gap-2 py-2">
                {/* 사진처럼 ‘항목 버튼’ 느낌만. (기능은 나중에 연결 가능) */}
                <button className="border border-sky-700 bg-sky-700 px-3 py-1 text-[12px] font-semibold text-white hover:bg-sky-600">
                  전체글
                </button>
                <button className="border border-slate-300 bg-white px-3 py-1 text-[12px] font-semibold text-slate-800 hover:bg-slate-50">
                  공지
                </button>
                <button className="border border-slate-300 bg-white px-3 py-1 text-[12px] font-semibold text-slate-800 hover:bg-slate-50">
                  인기글
                </button>

                <div className="ml-auto text-[12px] text-slate-500">
                  {/* 자리만 잡아둠 */}
                  정렬/필터 자리
                </div>
              </div>
            </div>
          </div>
        </FullBleed>
      </div>

      {/* ✅ md(패드)부터는 글목록 + 인기글을 옆으로 */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        {/* ✅ 왼쪽(게시글 영역) */}
        <section className="md:col-span-7 lg:col-span-8 md:max-w-[560px] md:justify-self-start">
          {/* ✅ 4) 설명 배너: 더 두껍게(높이/패딩 크게) + 왼쪽 가로만 */}
          <div className="mb-4 border border-sky-700 bg-white">
            <div className="border-b border-sky-700 bg-sky-50 px-4 py-2 text-[12px] font-semibold text-sky-900">
              사이트 배너
            </div>

            {/* 두껍게 */}
            <div className="px-4 py-6">
              <div className="flex items-center gap-4">
                {/* 로고 자리 */}
                <div className="h-16 w-16 border border-slate-300 bg-white flex items-center justify-center text-[11px] font-semibold text-slate-700">
                  LOGO
                </div>

                {/* 설명 */}
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold text-slate-900">
                    여기에 로고/설명/공지 문구 넣는 영역
                  </div>
                  <div className="mt-1 text-[12px] text-slate-600 leading-relaxed">
                    예) 학교 커뮤니티입니다. 욕설/비방 금지, 공지 필독. (문구는 네가 원하는대로 바꾸면 됨)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ 글 목록(표) - 사각형 + 선명하게 */}
          {loading ? (
            <div className="text-slate-600 text-sm">불러오는 중…</div>
          ) : orderedPosts.length === 0 ? (
            <div className="border border-slate-300 bg-white p-4 text-slate-700 text-sm">아직 글이 없습니다.</div>
          ) : (
            <div className="overflow-hidden border border-slate-400 bg-white">
              {/* table header */}
              <div className="border-b border-slate-400 bg-white">
                <div className="grid grid-cols-12 items-center px-3 py-2 text-[11px] font-semibold text-slate-900">
                  <div className="col-span-2">번호</div>
                  <div className="col-span-6 sm:col-span-5">제목</div>
                  <div className="hidden sm:block sm:col-span-2">글쓴이</div>
                  <div className="col-span-2 sm:col-span-2 text-right">작성일</div>
                  <div className="col-span-2 sm:col-span-1 text-right">조회</div>
                </div>
              </div>

              {/* rows */}
              <ul className="divide-y divide-slate-200">
                {orderedPosts.map((p) => {
                  const isAdmin = p.author?.role === "admin";
                  const idOk = typeof p.id === "string" && p.id.length > 0;
                  const href = idOk ? `/community/free/${encodeURIComponent(p.id)}` : "/community/free";
                  const num = !isAdmin && idOk ? numberMap.get(p.id) : undefined;

                  const username = p.author?.username ?? "unknown";
                  const date = fmtCompactDate(p.created_at);

                  return (
                    <li
                      key={p.id ?? crypto.randomUUID()}
                      className={isAdmin ? "bg-amber-50" : "hover:bg-slate-50"}
                    >
                      <div className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm">
                        {/* 번호 */}
                        <div className="col-span-2 text-[12px] text-slate-900">
                          {isAdmin ? (
                            <NoticeBadge />
                          ) : (
                            <span className="inline-flex min-w-8 items-center justify-center border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800">
                              {typeof num === "number" ? num : "-"}
                            </span>
                          )}
                        </div>

                        {/* 제목 */}
                        <div className="col-span-6 sm:col-span-5 min-w-0">
                          <Link
                            href={href}
                            className={"block min-w-0 truncate font-medium " + (isAdmin ? "text-amber-800" : "text-slate-900")}
                            title={p.title}
                          >
                            {p.title}
                          </Link>
                        </div>

                        {/* 글쓴이 */}
                        <div className="hidden sm:block sm:col-span-2 min-w-0 truncate text-slate-800 text-[12px]">
                          {username}
                          {isAdmin ? <span className="ml-1 text-amber-600 font-semibold">★</span> : null}
                        </div>

                        {/* 작성일 */}
                        <div className="col-span-2 sm:col-span-2 text-right text-[12px] text-slate-700">
                          {date}
                        </div>

                        {/* 조회 */}
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
        </section>

        {/* ✅ 오른쪽(인기글) - 침범 안함 */}
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
                    <Link
                      href={`/community/free/${encodeURIComponent(p.id)}`}
                      className="block border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate font-semibold text-[13px] text-slate-900">
                          #{idx + 1} {p.title}
                        </div>
                        <div className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap">
                          조회 {p.view_count}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <VisitorsBox count={visitors} />
          </div>
        </aside>

        {/* 모바일 인기글 아래 */}
        <section className="md:hidden border border-slate-300 bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">🔥 인기글 TOP 3</span>
            <span className="text-xs text-slate-500">(조회수)</span>
          </div>

          {loading ? (
            <div className="text-slate-500 text-sm">불러오는 중…</div>
          ) : top3.length === 0 ? (
            <div className="text-slate-500 text-sm">아직 데이터가 없습니다.</div>
          ) : (
            <ul className="space-y-1.5">
              {top3.map((p, idx) => (
                <li key={p.id}>
                  <Link
                    href={`/community/free/${encodeURIComponent(p.id)}`}
                    className="block border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate font-semibold text-[13px] text-slate-900">
                        #{idx + 1} {p.title}
                      </div>
                      <div className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap">
                        조회 {p.view_count}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <VisitorsBox count={visitors} />
        </section>
      </div>
    </main>
  );
}
