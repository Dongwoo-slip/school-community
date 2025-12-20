"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AnonymousChatBox from "@/components/AnonymousChatBox";

type Poll = { question?: string; options?: { id: string; text: string }[] };
type Post = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
  poll?: Poll | null;
  image_urls?: string[] | null;
  author_id?: string | null;
  author?: { username: string | null; role: string | null };
};
type Me = { userId: string | null; role: string; username: string | null };

type Noti = {
  id: string;
  type: string;
  actor_username: string | null;
  post_id: string | null;
  created_at: string;
  read: boolean;
};

type Ctx = {
  me: Me;
  posts: Post[];
  loading: boolean;
  visitors: number | null;
  members: number | null;

  query: string;
  setQuery: (v: string) => void;

  orderedPosts: Post[];
  numberMap: Map<string, number>;
  top3: Post[];

  refreshAll: () => Promise<void>;
  onLogout: () => Promise<void>;
};

const FreeCtx = createContext<Ctx | null>(null);
export function useFreeBoard() {
  const v = useContext(FreeCtx);
  if (!v) throw new Error("useFreeBoard must be used within FreeBoard layout");
  return v;
}

function FullBleed({ children }: { children: ReactNode }) {
  return <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">{children}</div>;
}

function TabLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();

  const active =
    href === "/community/free"
      ? pathname === "/community/free"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={
        active
          ? "border border-sky-700 bg-sky-700 px-3 py-1 text-[12px] font-semibold text-white hover:bg-sky-600"
          : "border border-slate-300 bg-white px-3 py-1 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
      }
    >
      {children}
    </Link>
  );
}

function fmtNotiTime(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

function StatMini({ title, value }: { title: string; value: number | null }) {
  return (
    <div className="border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
      <div className="mt-0.5 text-[14px] font-extrabold text-slate-900">
        {value === null ? "-" : value.toLocaleString()}
      </div>
    </div>
  );
}

/* ----------------- Layout ----------------- */
export default function FreeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<number | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const [notiOpen, setNotiOpen] = useState(false);
  const [notis, setNotis] = useState<Noti[]>([]);
  const [unread, setUnread] = useState(0);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setMe({ userId: json.userId ?? null, role: json.role ?? "guest", username: json.username ?? null });
  }

  async function loadPosts() {
    const res = await fetch("/api/posts?board=free", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setPosts(Array.isArray(json.data) ? json.data : []);
  }

  async function loadVisitors() {
    const res = await fetch("/api/stats/visitors", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setVisitors(typeof json.count === "number" ? json.count : 0);
  }

  async function loadMembers() {
    const res = await fetch("/api/stats/users", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setMembers(typeof json.count === "number" ? json.count : 0);
  }

  async function loadNotifications() {
    if (!me.userId) {
      setNotis([]);
      setUnread(0);
      return;
    }
    const res = await fetch("/api/notifications", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setNotis(Array.isArray(json.data) ? json.data : []);
    setUnread(typeof json.unread === "number" ? json.unread : 0);
  }

  async function markNotificationsRead() {
    if (!me.userId) return;
    await fetch("/api/notifications/read", { method: "POST", credentials: "include" }).catch(() => null);
    setNotis((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function refreshAll() {
    setLoading(true);
    await Promise.all([loadMe(), loadPosts(), loadVisitors(), loadMembers()]);
    setLoading(false);
  }

  async function onLogout() {
    await fetch("/logout", { method: "POST", credentials: "include" }).catch(() => null);
    await loadMe();
    setNotiOpen(false);
    setNotis([]);
    setUnread(0);
    router.refresh();
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me.userId) return;
    loadNotifications();
    const t = setInterval(loadNotifications, 25000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.userId]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-noti-root='1']")) return;
      setNotiOpen(false);
    }
    if (notiOpen) document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [notiOpen]);

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

  const reportUnread = useMemo(() => {
    if (me.role !== "admin") return 0;
    return (notis ?? []).filter((n) => n.type === "report" && n.read === false).length;
  }, [notis, me.role]);

  const ctxValue: Ctx = {
    me,
    posts,
    loading,
    visitors,
    members,
    query,
    setQuery,
    orderedPosts,
    numberMap,
    top3,
    refreshAll,
    onLogout,
  };

  return (
    <FreeCtx.Provider value={ctxValue}>
      <main className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-5">
        {/* 상단 고정 */}
        <div className="sticky top-0 z-40 bg-white pt-0">
          <div className="flex items-start justify-between gap-3">
            {/* 왼쪽 */}
            <div className="min-w-0">
              <div className="flex items-end gap-1">
                <Link href="/community/free" className="block">
                  <img
                    src="/logo.png"
                    alt="logo"
                    className="h-10 sm:h-12 md:h-14 w-auto object-contain max-w-[360px] sm:max-w-[460px] md:max-w-[520px]"
                  />
                </Link>

                <div className="hidden sm:block pb-1 text-[12px] font-semibold text-slate-700 whitespace-nowrap -ml-0.5">
                  청주고 전용 커뮤니티
                </div>
              </div>

              <div className="mt-1 text-[12px] font-bold text-slate-900">
                자유게시판 <span className="mx-1 text-slate-400">·</span>{" "}
                <span className="text-slate-600">구인구직</span>
              </div>
            </div>

            {/* 검색창 */}
            <div className="hidden md:flex flex-1 justify-center pt-3">
              <form className="w-full max-w-[320px]" onSubmit={(e) => e.preventDefault()}>
                <div className="flex items-stretch border border-slate-800 bg-white">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="게시글 검색 (제목)"
                    className="w-full px-3 py-2 text-[12px] text-slate-900 outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="검색"
                    className="border-l border-sky-700 bg-sky-700 px-4 text-white hover:bg-sky-600"
                  >
                    <span className="text-[16px] leading-none">🔍</span>
                  </button>
                </div>

                {query.trim() ? (
                  <div className="mt-1 text-[11px] text-slate-500">
                    검색중…{" "}
                    <button type="button" className="ml-1 underline" onClick={() => setQuery("")}>
                      지우기
                    </button>
                  </div>
                ) : null}
              </form>
            </div>

            {/* 오른쪽 */}
            <div className="flex items-start gap-2">
              <div className="hidden sm:block text-right text-[12px] text-slate-600 pt-0 mr-2 -mt-0.5">
                {me.userId ? (
                  <>
                    로그인:{" "}
                    <span className="font-semibold text-emerald-700">
                      {me.username ?? "unknown"}
                    </span>
                    {me.role === "admin" ? (
                      <span className="ml-1 font-semibold text-amber-700">★</span>
                    ) : null}
                  </>
                ) : (
                  "로그인되지 않음"
                )}
              </div>

              <div className="relative flex items-center gap-1.5 -mt-0.5" data-noti-root="1">
                {me.role === "admin" ? (
                  <Link
                    href="/community/free/admin/reports"
                    className={
                      "relative border px-2 py-1 text-[11px] font-semibold " +
                      (reportUnread > 0
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-rose-400 text-rose-700 bg-white hover:bg-rose-50")
                    }
                    title="신고 접수된 글"
                  >
                    🚩 신고접수
                    {reportUnread > 0 ? (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
                    ) : null}
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={async () => {
                    if (!me.userId) return alert("로그인이 필요합니다.");
                    const next = !notiOpen;
                    setNotiOpen(next);
                    if (next) {
                      await loadNotifications();
                      await markNotificationsRead();
                    }
                  }}
                  className="relative border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50"
                  aria-label="알림"
                  title="알림"
                >
                  <span className="text-[14px] leading-none">{unread > 0 ? "🔔" : "🔕"}</span>
                  {unread > 0 ? (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
                  ) : null}
                </button>

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

                {notiOpen ? (
                  <div className="absolute right-0 top-9 z-50 w-[320px] overflow-hidden border border-slate-300 bg-white shadow-lg">
                    <div className="border-b border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-900">
                      알림
                    </div>

                    <div className="max-h-[260px] overflow-auto">
                      {notis.length === 0 ? (
                        <div className="px-3 py-4 text-[12px] text-slate-600">새 알림이 없습니다.</div>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {notis.slice(0, 15).map((n) => {
                            const actor = n.actor_username ?? "누군가";
                            const msg =
                              n.type === "comment"
                                ? `${actor}님이 회원님의 글에 댓글을 달았습니다.`
                                : n.type === "vote"
                                ? `${actor}님이 회원님의 글에 투표를 했습니다.`
                                : n.type === "like"
                                ? `${actor}님이 회원님의 글에 좋아요를 눌렀습니다.`
                                : n.type === "report"
                                ? `${actor}님이 글을 신고했습니다.`
                                : `${actor}님의 활동 알림이 있습니다.`;

                            const href = n.post_id
                              ? `/community/free/${encodeURIComponent(n.post_id)}`
                              : "/community/free";

                            return (
                              <li key={n.id} className="px-3 py-2">
                                <Link
                                  href={href}
                                  className="block hover:underline"
                                  onClick={() => setNotiOpen(false)}
                                >
                                  <div className="text-[12px] text-slate-800">{msg}</div>
                                  <div className="mt-0.5 text-[11px] text-slate-500">
                                    {fmtNotiTime(n.created_at)}
                                  </div>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-slate-200 px-3 py-2">
                      <Link
                        href="/community/free/all?mine=1"
                        className="block text-[12px] font-semibold text-slate-900 hover:underline"
                        onClick={() => setNotiOpen(false)}
                      >
                        내가 쓴 글 (전체글)
                      </Link>
                      <Link
                        href="/community/free/all"
                        className="mt-1 block text-[12px] text-slate-600 hover:underline"
                        onClick={() => setNotiOpen(false)}
                      >
                        전체글로 이동
                      </Link>
                      <Link
                        href="/community/free"
                        className="mt-1 block text-[12px] text-slate-600 hover:underline"
                        onClick={() => setNotiOpen(false)}
                      >
                        메인으로 이동
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* 모바일 검색 */}
          <div className="mt-3 md:hidden">
            <div className="border border-slate-300 bg-white">
              <div className="flex items-stretch">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="게시글 검색 (제목)"
                  className="w-full px-3 py-2 text-[12px] text-slate-900 outline-none"
                />
                <button
                  type="button"
                  aria-label="검색"
                  className="border-l border-sky-700 bg-sky-700 px-4 text-white hover:bg-sky-600"
                >
                  <span className="text-[16px] leading-none">🔍</span>
                </button>
              </div>
            </div>
          </div>

          {/* 탭: 메인 / 전체글 / 급식 */}
          <div className="mt-3">
            <FullBleed>
              <div className="border-t-2 border-b-2 border-sky-700 bg-white">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                  <div className="flex items-center gap-2 py-2">
  {/* ✅ 모바일: 가로 스크롤 탭 */}
  <div className="flex flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap pr-2 no-scrollbar">
    <TabLink href="/community/free">메인</TabLink>
    <TabLink href="/community/free/all">전체글</TabLink>
    <TabLink href="/community/free/meal">오늘의 급식</TabLink>
    {/* (기존에 남아있는 탭들 쓰는 경우 여기에 그대로 추가) */}
  </div>

  {/* ✅ 정렬/필터 자리는 PC에서만 보여주기 */}
  <div className="hidden sm:block text-[12px] text-slate-500 whitespace-nowrap">
    정렬/필터 자리
  </div>
</div>

                </div>
              </div>
            </FullBleed>
          </div>

          <div className="border-b border-slate-200 mt-3" />
        </div>

        {/* 본문 + 오른쪽 */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          <section className="md:col-span-8 lg:col-span-9 md:max-w-none md:justify-self-stretch">
            {children}
          </section>

          <aside className="hidden md:block md:col-span-4 lg:col-span-3 md:max-w-none md:justify-self-stretch">
            <div className="sticky top-6">
              <div className="border border-slate-300 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                    오늘의 TOPIC
                  </span>
                  <span className="text-[11px] text-slate-500">(조회수)</span>
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

                {/* ✅ 통계: topic 밑으로 이동 */}
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <StatMini title="누적 회원 수" value={members} />
                  <StatMini title="누적 방문 수" value={visitors} />
                </div>
              </div>

              {/* ✅ 채팅 유지 */}
              <AnonymousChatBox meUserId={me.userId} />
            </div>
          </aside>
        </div>
      </main>
    </FreeCtx.Provider>
  );
}
