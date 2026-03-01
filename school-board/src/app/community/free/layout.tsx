"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AnonymousChatBox from "@/components/AnonymousChatBox";
import { getTier, TIERS } from "@/lib/tiers";

// ... types remain same ...
type Poll = { question?: string; options?: { id: string; text: string }[] };
type Post = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
  like_count?: number | null;
  poll?: Poll | null;
  image_urls?: string[] | null;
  author_id?: string | null;
  author?: { username: string | null; role: string | null; points?: number };
};
type Me = { userId: string | null; role: string; username: string | null; points: number; badge: string[] };
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

function TabLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={
        "transition-standard relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold " +
        (active
          ? "bg-sky-500/10 text-sky-400 after:absolute after:bottom-[-2px] after:left-2 after:right-2 after:h-[2px] after:bg-sky-500 after:content-['']"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200")
      }
    >
      {children}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="glass flex-1 rounded-xl p-3 text-center">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="mt-1 text-lg font-black text-white">{value === null ? "-" : value.toLocaleString()}</div>
    </div>
  );
}

const KST_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function fmtNotiTime(iso: string) {
  try {
    const parts = KST_FMT.formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
  } catch {
    return "";
  }
}

export default function FreeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null, points: 0, badge: [] });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<number | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [notiOpen, setNotiOpen] = useState(false);
  const [notis, setNotis] = useState<Noti[]>([]);
  const [unread, setUnread] = useState(0);
  const [dmUnread, setDmUnread] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setMe({
      userId: json.userId ?? null,
      role: json.role ?? "guest",
      username: json.username ?? null,
      points: Number(json.points) || 0,
      badge: Array.isArray(json.badge) ? json.badge : [],
    });
  }
  async function loadPosts() {
    const res = await fetch("/api/posts?board=free", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setPosts(json.data ?? []);
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
    if (!me.userId) { setNotis([]); setUnread(0); return; }
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
  async function loadDmUnread() {
    if (!me.userId) { setDmUnread(0); return; }
    const res = await fetch("/api/messages/inbox?limit=50", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (typeof json?.unread === "number") { setDmUnread(json.unread); return; }
    const arr = Array.isArray(json?.data) ? json.data : [];
    const cnt = arr.filter((x: any) => x?.read === false).length;
    setDmUnread(cnt);
  }
  async function refreshAll() {
    setLoading(true);
    await Promise.all([loadMe(), loadPosts(), loadVisitors(), loadMembers()]);
    setLoading(false);
  }
  async function onLogout() {
    await fetch("/logout", { method: "POST", credentials: "include" }).catch(() => null);
    await loadMe();
    setNotiOpen(false); setNotis([]); setUnread(0); setDmUnread(0);
    router.refresh();
  }

  useEffect(() => { refreshAll(); }, []);
  useEffect(() => {
    if (!me.userId) return;
    loadNotifications(); loadDmUnread();
    const t1 = setInterval(loadNotifications, 25000);
    const t2 = setInterval(loadDmUnread, 20000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [me.userId]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-noti-root='1']")) return;
      setNotiOpen(false);
    }
    function onDocDownGuide(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-guide-root='1']")) return;
      setGuideOpen(false);
    }
    if (notiOpen) document.addEventListener("mousedown", onDocDown);
    if (guideOpen) document.addEventListener("mousedown", onDocDownGuide);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("mousedown", onDocDownGuide);
    };
  }, [notiOpen, guideOpen]);

  const orderedPosts = useMemo(() => {
    const admin = posts.filter((p) => p.author?.role === "admin");
    const normal = posts.filter((p) => p.author?.role !== "admin");
    admin.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    normal.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return [...admin, ...normal];
  }, [posts]);

  const numberMap = useMemo(() => {
    const normal = posts.filter((p) => p.author?.role !== "admin" && typeof p.id === "string" && p.id.length > 0);
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

  const ctxValue: Ctx = { me, posts, loading, visitors, members, query, setQuery, orderedPosts, numberMap, top3, refreshAll, onLogout };

  return (
    <FreeCtx.Provider value={ctxValue}>
      <header className="sticky top-0 z-50 glass border-b-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/community/free" className="group flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 font-black text-white shadow-lg shadow-sky-500/30 transition-transform group-hover:scale-110">
                SQ
              </div>
              <div className="hidden flex-col sm:flex">
                <span className="text-xl font-black tracking-tight text-white">Square</span>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">CheongJu High</span>
              </div>
            </Link>

            {/* Desktop Search */}
            <div className="hidden flex-1 justify-center md:flex">
              <form className="relative w-full max-w-sm" onSubmit={(e) => e.preventDefault()}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="제목으로 게시글 검색..."
                  className="w-full rounded-full border border-white/5 bg-white/5 px-6 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:bg-white/10 focus:ring-2 focus:ring-sky-500/30"
                />
                <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400">
                  🔍
                </button>
              </form>
            </div>

            {/* User Controls */}
            <div className="flex items-center gap-3" data-noti-root="1">
              {/* Notification & DM Icons */}
              <div className="flex items-center gap-1">
                {me.userId && (
                  <>
                    <Link href="/community/free/messages" className="btn-ghost relative px-2 hover:bg-white/5" title="쪽지">
                      <span className="text-xl">✉️</span>
                      {dmUnread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0f172a]" />}
                    </Link>
                    <button
                      onClick={async () => {
                        const next = !notiOpen; setNotiOpen(next);
                        if (next) { await loadNotifications(); await markNotificationsRead(); }
                      }}
                      className="btn-ghost relative px-2 hover:bg-white/5"
                      title="알림"
                    >
                      <span className="text-xl">{unread > 0 ? "🔔" : "🔕"}</span>
                      {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0f172a]" />}
                    </button>
                    {/* 포인트 및 등급 가이드 (클릭 시 토글, 데스크탑은 호버 가능) */}
                    <div className="hidden items-center gap-2 sm:flex" data-guide-root="1">
                      <div className="group relative">
                        <button
                          onClick={() => setGuideOpen(!guideOpen)}
                          className="flex items-center gap-2 rounded-full bg-white/5 border border-white/5 pl-2 pr-3 py-1 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {(() => {
                            const t = getTier(me.points, me.role);
                            return (
                              <>
                                <span className="text-sm" title={t.name}>{t.icon}</span>
                                <div className="flex flex-col items-start leading-none">
                                  <span className={`text-[9px] font-black uppercase tracking-tighter ${t.color}`}>{t.name}</span>
                                  <span className="text-[11px] font-black text-white">{me.points.toLocaleString()}<span className="ml-0.5 text-[8px] opacity-60">EXP</span></span>
                                </div>
                              </>
                            );
                          })()}
                        </button>

                        {/* 툴팁: 포인트 및 등급 가이드 */}
                        <div className={`
                          absolute right-0 top-full mt-2 w-64 rounded-2xl glass border border-white/10 p-5 shadow-2xl z-[100] transition-all
                          ${guideOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'}
                        `}>
                          <h4 className="text-xs font-black text-white mb-3 flex items-center gap-2">
                            <span className="text-sky-400">📊</span> 성취 가이드
                          </h4>

                          <div className="space-y-4">
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">획득 방법</div>
                              <ul className="space-y-1.5 text-[10px] text-slate-300">
                                <li className="flex justify-between"><span>게시글 작성</span> <span className="font-bold text-sky-400">+10 EXP</span></li>
                                <li className="flex justify-between"><span>댓글 작성</span> <span className="font-bold text-sky-400">+5 EXP</span></li>
                              </ul>
                            </div>

                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">등급 기준</div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                                {TIERS.map(t => (
                                  <div key={t.name} className="flex items-center justify-between group/t">
                                    <span className="text-slate-400">{t.icon} {t.name}</span>
                                    <span className="font-bold text-slate-200">{t.minPoints}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 border-t border-white/5 pt-3">
                            <p className="text-[9px] text-slate-500 leading-tight">활동을 통해 학교에서 자신의 가치를 증명하세요!</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link href="/community/free/me" className="btn-ghost px-2" title="내 정보">
                      👤
                    </Link>
                  </>
                )}
              </div>

              {/* Login/Signup or Logout */}
              {!me.userId ? (
                <div className="flex items-center gap-2">
                  <Link href="/login" className="btn-ghost text-xs">로그인</Link>
                  <Link href="/signup" className="btn-primary py-1.5 px-3 text-xs">가입하기</Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {me.role === "admin" && (
                    <Link href="/community/free/reports" className="btn-secondary py-1.5 px-3 text-xs relative border-rose-500/30 text-rose-400">
                      신고함
                      {reportUnread > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />}
                    </Link>
                  )}
                  <button onClick={onLogout} className="btn-secondary py-1.5 px-3 text-xs">나가기</button>
                </div>
              )}
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 border-t border-white/5 py-2 overflow-x-auto no-scrollbar">
            <TabLink href="/community/free">메인</TabLink>
            <TabLink href="/community/free/all">전체글</TabLink>
            <TabLink href="/community/free/jobs">구인구직</TabLink>
            <TabLink href="/community/free/meal">급식</TabLink>
            <TabLink href="/community/free/best">베스트</TabLink>
          </nav>
        </div>

        {/* Notifications Popover */}
        {notiOpen && (
          <div className="absolute right-4 top-16 w-80 overflow-hidden rounded-2xl glass shadow-2xl">
            <div className="bg-white/5 px-4 py-3 text-xs font-bold text-slate-400 border-b border-white/5 uppercase">알림 목록</div>
            <div className="max-h-72 overflow-y-auto">
              {notis.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-600">새로운 알림이 없습니다.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notis.map(n => (
                    <Link
                      key={n.id}
                      href={n.post_id ? `/community/free/${n.post_id}` : "/community/free"}
                      className="block p-4 hover:bg-white/5"
                      onClick={() => setNotiOpen(false)}
                    >
                      <div className="text-sm text-slate-200">{n.type} 관련 새로운 소식</div>
                      <div className="mt-1 text-[10px] text-slate-500">{fmtNotiTime(n.created_at)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Content */}
          <section className="lg:col-span-8 xl:col-span-9">
            {children}
          </section>

          {/* Sidebar */}
          <aside className="hidden space-y-8 lg:mt-0 lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-28 space-y-8">
              {/* Top 3 Posts */}
              <div className="glass overflow-hidden rounded-2xl">
                <div className="bg-white/5 px-6 py-4 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-lg">🔥</span> 오늘의 핫이슈
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {top3.map((p, i) => {
                    const t = getTier(p.author?.points || 0, p.author?.role || undefined);
                    return (
                      <Link
                        key={p.id}
                        href={`/community/free/${p.id}`}
                        className="glass-hover flex flex-col rounded-xl bg-white/5 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Top {i + 1}</span>
                          <span className="text-[10px]" title={t.name}>{t.icon}</span>
                        </div>
                        <span className="mt-1 truncate text-sm font-medium text-slate-200">{p.title}</span>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${t.color}`}>{p.author?.username || "익명"}</span>
                          <span className="text-slate-500">조회 {p.view_count}회</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <StatCard label="Total User" value={members} />
                <StatCard label="Total Visit" value={visitors} />
              </div>

              {/* Chat Box */}
              <AnonymousChatBox />
            </div>
          </aside>
        </div>
      </main>
    </FreeCtx.Provider>
  );
}
