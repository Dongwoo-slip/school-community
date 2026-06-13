"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AnonymousChatBox from "@/components/AnonymousChatBox";
import FloatingLeftAd from "@/components/FloatingLeftAd";
import { SquareLogoLockup } from "@/components/SquareLogo";
import { getTier, TIERS } from "@/lib/tiers";
import { formatAdminStudentLabel, type AuthorIdentity } from "@/lib/authorDisplay";

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
  author?: AuthorIdentity | null;
};
type Me = {
  userId: string | null;
  role: string;
  username: string | null;
  points: number;
  badge: string[];
  studentVerified: boolean;
  studentNo: string | null;
  studentName: string | null;
};
type Noti = {
  id: string;
  type: string;
  actor_username: string | null;
  post_id: string | null;
  created_at: string;
  read: boolean;
};
type Dday = {
  id: string;
  eventName: string;
  targetDate: string;
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
      className="community-tab-link"
      style={{
        padding: '0.55rem 0.85rem',
        fontSize: '0.825rem',
        fontWeight: active ? 650 : 500,
        color: active ? 'var(--brand-light)' : 'var(--text-secondary)',
        borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
        background: active ? 'var(--brand-dim)' : 'transparent',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        marginBottom: '-1px',
      }}
    >
      {children}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '0.6rem 0.75rem', flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 650, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{value === null ? '-' : value.toLocaleString()}</div>
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

function kstTodayIndex() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function targetDateIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function getDdayText(targetDate: string) {
  const target = targetDateIndex(targetDate);
  if (target === null) return "";
  const diff = target - kstTodayIndex();
  if (diff === 0) return "D-Day";
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function DdayBadges({ ddays, isAdmin }: { ddays: Dday[]; isAdmin: boolean }) {
  const visible = ddays
    .map((dday) => ({ ...dday, ddayText: getDdayText(dday.targetDate) }))
    .filter((dday) => dday.eventName && dday.targetDate && dday.ddayText);

  if (visible.length === 0) return null;

  return (
    <div className="dday-tab-list" aria-label="D-Day">
      {visible.map((dday) => {
        const content = (
          <>
            <span className="dday-event">{dday.eventName}</span>
            <span className="dday-count">{dday.ddayText}</span>
          </>
        );

        return isAdmin ? (
          <Link key={dday.id} href="/community/free/admin/dday" className="dday-tab-badge" title="D-Day 관리">
            {content}
          </Link>
        ) : (
          <div key={dday.id} className="dday-tab-badge" title={`${dday.eventName} ${dday.ddayText}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function HeaderActionIcon({ type }: { type: "message" | "notice" | "profile" }) {
  if (type === "message") {
    return (
      <svg className="header-action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m5 8 7 5 7-5" />
      </svg>
    );
  }

  if (type === "notice") {
    return (
      <svg className="header-action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 9a6 6 0 0 0-12 0c0 6-2.2 7.2-2.2 8h16.4C20.2 16.2 18 15 18 9Z" />
        <path d="M10 20h4" />
      </svg>
    );
  }

  return (
    <svg className="header-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19c1.5-3.3 12.5-3.3 14 0" />
    </svg>
  );
}

export default function FreeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me>({
    userId: null,
    role: "guest",
    username: null,
    points: 0,
    badge: [],
    studentVerified: false,
    studentNo: null,
    studentName: null,
  });
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
  const [ddays, setDdays] = useState<Dday[]>([]);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    const next = {
      userId: json.userId ?? null,
      role: json.role ?? "guest",
      username: json.username ?? null,
      points: Number(json.points) || 0,
      badge: Array.isArray(json.badge) ? json.badge : [],
      studentVerified: Boolean(json.studentVerified),
      studentNo: json.studentNo ?? null,
      studentName: json.studentName ?? null,
    };
    setMe(next);
    return next;
  }
  async function loadPosts() {
    const res = await fetch("/api/posts?board=free", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setPosts(json.data ?? []);
  }
  async function loadVisitors() {
    const res = await fetch("/api/stats/visitors", { method: "POST", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (typeof json.count === "number") setVisitors(json.count);
  }
  async function loadMembers() {
    const res = await fetch("/api/stats/users", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setMembers(typeof json.count === "number" ? json.count : null);
  }
  async function loadDday() {
    const res = await fetch("/api/dday", { cache: "force-cache" });
    const json = await res.json().catch(() => ({}));
    const data = json?.data;
    const list = Array.isArray(data) ? data : data ? [data] : [];
    setDdays(list.filter((row) => row?.eventName && row?.targetDate));
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
    const arr: Array<{ read?: boolean }> = Array.isArray(json?.data) ? json.data : [];
    const cnt = arr.filter((x) => x?.read === false).length;
    setDmUnread(cnt);
  }
  async function refreshAll() {
    setLoading(true);
    const nextMe = await loadMe();
    await Promise.all([loadPosts(), loadVisitors(), loadMembers(), loadDday()]);
    setLoading(false);
  }
  async function onLogout() {
    await fetch("/logout", { method: "POST", credentials: "include" }).catch(() => null);
    await loadMe();
    setNotiOpen(false); setNotis([]); setUnread(0); setDmUnread(0);
    router.refresh();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAll();
  }, []);
  useEffect(() => {
    if (!me.userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications();
    void loadDmUnread();
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
  const showMobileHomeChat = pathname === "/community/free";

  const ctxValue: Ctx = { me, posts, loading, visitors, members, query, setQuery, orderedPosts, numberMap, top3, refreshAll, onLogout };

  return (
    <FreeCtx.Provider value={ctxValue}>
      {/* ── Header ── */}
      <FloatingLeftAd topAnchorId="community-header" />
      <header id="community-header" style={{ background: 'rgba(255,255,255,0.96)', borderBottom: '1px solid var(--border-mild)', boxShadow: '0 1px 0 rgba(15,23,42,0.04)' }} className="sticky top-0 z-50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="mobile-header-row flex h-14 items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/community/free" className="flex items-center gap-2.5 shrink-0 group">
              <SquareLogoLockup markSize={34} compact className="community-header-logo transition-opacity group-hover:opacity-90" />
            </Link>

            {/* Search */}
            <div className="hidden md:flex flex-1 justify-center px-6">
              <form className="relative w-full max-w-xs" onSubmit={(e) => e.preventDefault()}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="게시글 검색..."
                  className="w-full px-4 py-1.5 text-sm"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⌕</span>
              </form>
            </div>

            {/* Right controls */}
            <div className="mobile-header-actions flex min-w-0 items-center justify-end gap-1" data-noti-root="1">
              {me.userId && (
                <>
                  <Link href="/community/free/messages" className="btn-ghost header-action-button relative" title="쪽지" aria-label="쪽지">
                    <HeaderActionIcon type="message" />
                    <span className="header-action-label">쪽지</span>
                    {dmUnread > 0 && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-red)' }} />}
                  </Link>
                  <button
                    onClick={async () => {
                      const next = !notiOpen; setNotiOpen(next);
                      if (next) { await loadNotifications(); await markNotificationsRead(); }
                    }}
                    className="btn-ghost header-action-button relative"
                    title="알림"
                    aria-label="알림"
                    type="button"
                  >
                    <HeaderActionIcon type="notice" />
                    <span className="header-action-label">알림</span>
                    {unread > 0 && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-red)' }} />}
                  </button>

                  {/* EXP Pill */}
                  <div className="hidden sm:block" data-guide-root="1">
                    <div className="relative group">
                      <button
                        onClick={() => setGuideOpen(!guideOpen)}
                        className="flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-mild)', borderRadius: 4, padding: '0.3rem 0.65rem' }}
                      >
                        {(() => {
                          const t = getTier(me.points, me.role);
	                          return (
	                            <>
	                              <span className="header-tier-mark">EXP</span>
	                              <div className="flex flex-col items-start leading-none gap-0.5">
	                                <span className="text-[9px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
	                                <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{me.points.toLocaleString()}<span className="ml-0.5 text-[8px]" style={{ color: 'var(--text-muted)' }}>EXP</span></span>
	                              </div>
	                            </>
                          );
                        })()}
                      </button>

                      {/* EXP Guide Dropdown */}
                      <div className={`absolute right-0 top-full mt-2 w-60 z-[100] transition-all ${guideOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'
                        }`} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mild)', borderRadius: 4, boxShadow: '0 12px 28px rgba(15,23,42,0.12)', padding: '1rem' }}>
                        <div className="text-xs font-black mb-3" style={{ color: 'var(--text-primary)' }}>활동 가이드</div>
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span>게시글 작성</span><span className="font-bold" style={{ color: 'var(--brand-light)' }}>+10 EXP</span>
                          </div>
                          <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span>댓글 작성</span><span className="font-bold" style={{ color: 'var(--brand-light)' }}>+5 EXP</span>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                          <div className="mb-2 text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>등급 기준</div>
                          <div className="grid grid-cols-2 gap-1">
                            {TIERS.map(t => (
                              <div key={t.name} className="flex items-center gap-1">
                                <span className="text-xs">{t.icon}</span>
                                <span className={`text-[10px] font-semibold ${t.color}`}>{t.name}</span>
                                <span className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>{t.minPoints}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link href="/community/free/me" className="btn-ghost header-action-button" title="내 정보" aria-label="내 정보">
                    <HeaderActionIcon type="profile" />
                    <span className="header-action-label">내 정보</span>
                  </Link>
                </>
              )}

              {!me.userId ? (
                <div className="mobile-auth-actions flex items-center gap-2">
                  <Link href="/login" className="btn-ghost" style={{ fontSize: '0.8rem' }}>로그인</Link>
                  <Link href="/signup" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>가입하기</Link>
                </div>
              ) : (
                <div className="mobile-member-actions flex items-center gap-1.5">
                  {me.role === 'admin' && (
                    <Link href="/community/free/reports" className="admin-report-link relative" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-red)', background: 'rgba(200,45,63,0.08)', border: '1px solid rgba(200,45,63,0.22)', borderRadius: 4, padding: '0.3rem 0.65rem' }}>
                      신고함
                      {reportUnread > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full" style={{ background: 'var(--accent-red)' }} />}
                    </Link>
                  )}
                  <button onClick={onLogout} className="logout-button btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>로그아웃</button>
                </div>
              )}
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center overflow-x-auto no-scrollbar" style={{ gap: 0, borderTop: '1px solid var(--border-subtle)' }}>
            <TabLink href="/community/free">메인</TabLink>
            <TabLink href="/community/free/all">게시글</TabLink>
            <TabLink href="/community/free/jobs">구인구직</TabLink>
            <TabLink href="/community/free/meal">급식표</TabLink>
            <TabLink href="/community/free/best">베스트</TabLink>
            {me.role === "admin" && <TabLink href="/community/free/admin/dashboard">관리자</TabLink>}
            {me.role === "admin" && <TabLink href="/community/free/admin/popup">팝업관리</TabLink>}
            {me.role === "admin" && <TabLink href="/community/free/admin/ad">광고관리</TabLink>}
            {me.role === "admin" && <TabLink href="/community/free/admin/dday">D-Day</TabLink>}
            {me.role === "admin" && <TabLink href="/community/free/admin/verified">인증목록</TabLink>}
            <DdayBadges ddays={ddays} isAdmin={me.role === "admin"} />
          </nav>
        </div>

        {/* Notification popover */}
        {notiOpen && (
          <div className="notification-popover absolute z-50 overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mild)', borderRadius: 4, boxShadow: '0 12px 28px rgba(15,23,42,0.12)' }}>
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>알림</div>
            <div className="max-h-64 overflow-y-auto">
              {notis.length === 0 ? (
                <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>새 알림이 없습니다.</div>
              ) : (
                <div>
                  {notis.map(n => (
                    <Link
                      key={n.id}
                      href={n.post_id ? `/community/free/${n.post_id}` : '/community/free'}
                      className="block px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onClick={() => setNotiOpen(false)}
                    >
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{n.type} 관련 새로운 소식</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmtNotiTime(n.created_at)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="community-main mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mobile-stats-strip lg:hidden">
          <StatCard label="회원" value={members} />
          <StatCard label="방문" value={visitors} />
        </div>
        <div className="community-shell-grid grid grid-cols-1 lg:grid-cols-12">
          {/* Content */}
          <section className="lg:col-span-8 xl:col-span-9">
            {children}
            {showMobileHomeChat ? (
              <div className="mobile-chat-panel lg:hidden">
                <AnonymousChatBox />
              </div>
            ) : null}
          </section>

          {/* Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-20 space-y-4">

              {/* Hot Issue */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem' }}>🔥</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-primary)' }}>핫이슈</span>
                </div>
                <div style={{ padding: '0.5rem' }}>
                  {top3.map((p, i) => {
                    const t = getTier(p.author?.points || 0, p.author?.role || undefined);
                    return (
                      <Link
                        key={p.id}
                        href={`/community/free/${p.id}`}
                        prefetch={false}
                        className="glass-hover"
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem 0.5rem', borderRadius: 4 }}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--brand)', minWidth: 16, marginTop: 2 }}>0{i + 1}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <span className={t.color}>{p.author?.username || '익명'}</span>
                            {me.role === "admin" && (
                              <span style={{ marginLeft: '0.35rem', color: 'var(--text-muted)' }}>
                                {formatAdminStudentLabel(p.author)}
                              </span>
                            )}
                            <span style={{ marginLeft: '0.4rem' }}>조회수 {p.view_count}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-3">
                <StatCard label="멤버" value={members} />
                <StatCard label="방문" value={visitors} />
              </div>

              {me.role === "admin" && (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    관리자
                  </div>
                  <div style={{ padding: '0.5rem', display: 'grid', gap: '0.4rem' }}>
                    <Link href="/community/free/admin/dashboard" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      운영 통계
                    </Link>
                    <Link href="/community/free/admin/archive" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      보관함
                    </Link>
                    <Link href="/community/free/admin/deleted" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      삭제 로그
                    </Link>
                    <Link href="/community/free/admin/edits" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      수정 로그
                    </Link>
                    <Link href="/community/free/admin/popup" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      팝업 공지
                    </Link>
                    <Link href="/community/free/admin/ad" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      광고 관리
                    </Link>
                    <Link href="/community/free/admin/dday" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      D-Day 관리
                    </Link>
                    <Link href="/community/free/admin/verified" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      인증 목록
                    </Link>
                    <Link href="/community/free/admin/dm" className="btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}>
                      쪽지 보내기
                    </Link>
                  </div>
                </div>
              )}

              {/* Chat */}
              <AnonymousChatBox />
            </div>
          </aside>
        </div>
      </main>
      <footer className="mt-10 border-t border-slate-700 bg-slate-950" style={{ color: "#d8e2ef" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-[12px] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="font-semibold" style={{ color: "#f8fafc" }}>Square · 청주고등학교 커뮤니티</div>
          <div>학생들의 이야기를 안전하고 깔끔하게 나누는 공간입니다.</div>
        </div>
      </footer>
    </FreeCtx.Provider>
  );
}
