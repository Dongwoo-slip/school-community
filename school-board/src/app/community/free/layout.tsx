"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={
        "shrink-0 whitespace-nowrap border px-3 py-1 text-[12px] font-semibold " +
        (active
          ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-600"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50")
      }
    >
      {children}
    </Link>
  );
}

/* ✅ hydration/시간대 흔들림 방지: KST 고정 포맷 */
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

function StatPills({ members, visitors }: { members: number | null; visitors: number | null }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="border border-slate-300 bg-white p-2 text-center">
        <div className="text-[11px] font-semibold text-slate-600">누적 회원수</div>
        <div className="mt-0.5 text-[15px] font-extrabold text-slate-900">
          {members === null ? "-" : members.toLocaleString()}
        </div>
      </div>
      <div className="border border-slate-300 bg-white p-2 text-center">
        <div className="text-[11px] font-semibold text-slate-600">누적 방문수</div>
        <div className="mt-0.5 text-[15px] font-extrabold text-slate-900">
          {visitors === null ? "-" : visitors.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Chat (layout에 포함) ----------------- */
type ChatMsg = {
  id: string;
  user_id: string;
  anon_id: string | null;
  content: string;
  created_at: string;
};

function fmtChatTime(iso: string) {
  return fmtNotiTime(iso);
}

/** ✅ 어떤 환경에서도 가로로 뻗지 않게: 일정 글자마다 “보이지 않는 줄바꿈 기회” 추가 */
function addSoftBreaks(input: string, every = 18) {
  const ZWSP = "\u200B";
  let out = "";
  let run = 0;

  for (const ch of input) {
    out += ch;

    if (ch === "\n" || ch === " " || ch === "\t") {
      run = 0;
      continue;
    }

    run += 1;
    if (run >= every) {
      out += ZWSP;
      run = 0;
    }
  }
  return out;
}

function isNearBottom(el: HTMLElement, threshold = 160) {
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight;
  return remain < threshold;
}

function AnonymousChatBox({ me }: { me: Me }) {
  const [msgsAsc, setMsgsAsc] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [netErr, setNetErr] = useState<string | null>(null);
  const [text, setText] = useState("");

  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  const stickRef = React.useRef(true);
  const firstRef = React.useRef(true);
  const restoreRef = React.useRef<null | { top: number; height: number }>(null);

  const oldestCreatedAt = msgsAsc[0]?.created_at ?? null;

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior });
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  async function loadLatest() {
    const el = scrollerRef.current;
    if (el) stickRef.current = isNearBottom(el);

    try {
      const res = await fetch(`/api/chat?limit=25`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setNetErr(json?.error ?? `불러오기 실패 (${res.status})`);
        return;
      }

      setNetErr(null);
      const arr: ChatMsg[] = Array.isArray(json?.data) ? json.data : [];
      const nextAsc = [...arr].reverse(); // 서버 desc -> 화면 asc
      setMsgsAsc(nextAsc);
      setHasMore(Boolean(json?.hasMore));
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!oldestCreatedAt || busy) return;

    const el = scrollerRef.current;
    if (el) restoreRef.current = { top: el.scrollTop, height: el.scrollHeight };

    setBusy(true);
    try {
      const res = await fetch(`/api/chat?limit=25&before=${encodeURIComponent(oldestCreatedAt)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const arr: ChatMsg[] = Array.isArray(json?.data) ? json.data : [];
      const moreAsc = [...arr].reverse();

      setMsgsAsc((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...moreAsc.filter((m) => !seen.has(m.id)), ...prev];
      });

      setHasMore(Boolean(json?.hasMore));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!me.userId) {
      alert("로그인 후 이용할 수 있어요.");
      return;
    }

    const content = text.trim();
    if (!content) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        alert("로그인이 필요합니다.");
        return;
      }
      if (!res.ok) {
        alert(json?.error ?? "전송 실패");
        return;
      }

      setText("");
      stickRef.current = true; // 전송 후엔 최신 유지
      await loadLatest();
    } finally {
      setBusy(false);
    }
  }

  // ✅ “처음 로드시 맨 아래(최신)” + “아래 붙어있으면 최신 유지” (렌더 직후 보장)
  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // loadMore 후 위치 복원
    if (restoreRef.current) {
      const snap = restoreRef.current;
      const newH = el.scrollHeight;
      el.scrollTop = snap.top + (newH - snap.height);
      restoreRef.current = null;
      return;
    }

    // 첫 로드: 무조건 최신(맨 아래)
    if (firstRef.current && !loading) {
      firstRef.current = false;
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom("auto")));
      return;
    }

    // 사용자가 아래 보고 있으면 계속 최신 유지
    if (stickRef.current) {
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom("auto")));
    }
  }, [msgsAsc.length, loading]);

  useEffect(() => {
    loadLatest();
    const t = window.setInterval(loadLatest, 12000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-4 border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-slate-900">💬 실시간 익명채팅</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {me.userId ? "로그인 상태에서만 전송 가능" : "로그인하면 채팅을 보낼 수 있어요"}
          </div>
          {netErr ? <div className="text-[11px] text-rose-600 mt-1">⚠ {netErr}</div> : null}
        </div>

        <button
          type="button"
          onClick={loadLatest}
          className="text-[11px] text-slate-600 underline underline-offset-2 disabled:opacity-60"
          disabled={busy}
        >
          새로고침
        </button>
      </div>

      <div className="px-3 py-2">
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={busy || loading}
            className="w-full border border-slate-200 bg-white py-1.5 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            이전 내용 보기
          </button>
        ) : (
          <div className="text-center text-[11px] text-slate-400 py-1">처음입니다</div>
        )}
      </div>

      {/* ✅ 가로 스크롤 근본 차단 + 메시지 줄바꿈 강제 */}
      <div className="px-3 pb-3">
        <div
          ref={scrollerRef}
          className="h-[220px] overflow-y-auto border border-slate-200 bg-white p-2 space-y-2"
          style={{ overflowX: "hidden" }}
          onScroll={() => {
            const el = scrollerRef.current;
            if (!el) return;
            stickRef.current = isNearBottom(el);
          }}
        >
          {loading ? <div className="text-[12px] text-slate-600">불러오는 중…</div> : null}
          {msgsAsc.length === 0 && !loading ? <div className="text-[12px] text-slate-600">아직 채팅이 없습니다.</div> : null}

          {msgsAsc.map((m) => {
            const mine = !!me.userId && String(m.user_id) === String(me.userId);
            const label = m.anon_id ?? "익명";

            return (
              <div key={m.id} className={"flex min-w-0 " + (mine ? "justify-end" : "justify-start")}>
                <div className={"min-w-0 max-w-[85%] " + (mine ? "text-right" : "text-left")}>
                  <div className={"mb-0.5 flex items-center gap-2 min-w-0 " + (mine ? "justify-end" : "justify-start")}>
                    {!mine ? <span className="text-[10px] text-slate-500 shrink-0">{label}</span> : null}
                    <span className="text-[10px] text-slate-400 shrink-0" suppressHydrationWarning>
                      {fmtChatTime(m.created_at)}
                    </span>
                  </div>

                  <div
                    className={
                      "inline-block min-w-0 rounded border px-3 py-2 text-[12px] leading-snug text-slate-900 " +
                      (mine ? "bg-sky-50 border-sky-200" : "bg-slate-50 border-slate-200")
                    }
                    style={{
                      maxWidth: "100%",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {addSoftBreaks(m.content)}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        <div className="mt-2 flex items-stretch gap-2 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!me.userId || busy}
            placeholder={me.userId ? "메시지 입력… (Enter 전송 / Shift+Enter 줄바꿈)" : "로그인 후 채팅 가능"}
            className="w-full min-w-0 border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none disabled:bg-slate-100 resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!me.userId || busy || text.trim().length === 0}
            className="border border-sky-700 bg-sky-700 px-3 text-[12px] font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            전송
          </button>
        </div>
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

  // ✅ 쪽지함 빨간 점용
  const [dmUnread, setDmUnread] = useState(0);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setMe({ userId: json.userId ?? null, role: json.role ?? "guest", username: json.username ?? null });
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

  // ✅ ✅ 단 하나만! (중복 제거)
  async function loadDmUnread() {
    if (!me.userId) {
      setDmUnread(0);
      return;
    }

    // 서버가 unread를 내려주면 그걸 쓰고,
    // 아니면 data에서 read=false 개수로 fallback
    const res = await fetch("/api/messages/inbox?limit=50", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));

    if (typeof json?.unread === "number") {
      setDmUnread(json.unread);
      return;
    }

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
    setNotiOpen(false);
    setNotis([]);
    setUnread(0);
    setDmUnread(0);
    router.refresh();
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me.userId) return;
    loadNotifications();
    loadDmUnread();
    const t1 = setInterval(loadNotifications, 25000);
    const t2 = setInterval(loadDmUnread, 20000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
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
      <main className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-5 overflow-x-hidden">
        {/* 상단 */}
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
                자유게시판 <span className="mx-1 text-slate-400">·</span> <span className="text-slate-600">구인구직</span>
              </div>
            </div>

            {/* 검색 */}
            <div className="hidden md:flex flex-1 justify-center pt-3">
              <form className="w-full max-w-[320px]" onSubmit={(e) => e.preventDefault()}>
                <div className="flex items-stretch border border-slate-800 bg-white">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="게시글 검색 (제목)"
                    className="w-full px-3 py-2 text-[12px] text-slate-900 outline-none"
                  />
                  <button type="submit" aria-label="검색" className="border-l border-sky-700 bg-sky-700 px-4 text-white hover:bg-sky-600">
                    <span className="text-[16px] leading-none">🔍</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 오른쪽 */}
            <div className="flex items-start gap-2">
              <div className="hidden sm:block text-right text-[12px] text-slate-600 pt-0 mr-2 -mt-0.5">
                {me.userId ? (
                  <>
                    로그인: <span className="font-semibold text-emerald-700">{me.username ?? "unknown"}</span>
                    {me.role === "admin" ? <span className="ml-1 font-semibold text-amber-700">★</span> : null}
                  </>
                ) : (
                  "로그인되지 않음"
                )}
              </div>

              <div className="relative flex items-center gap-1.5 -mt-0.5" data-noti-root="1">
                {me.role === "admin" ? (
                  <Link
                    href="/community/free/admin/dm"
                    className="border border-emerald-400 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                    title="관리자 DM 센터"
                  >
                    🛠 DM센터
                  </Link>
                ) : null}

                {me.role === "admin" ? (
                  <Link
                    href="/community/free/admin/reports"
                    className={
                      "relative border px-2 py-1 text-[11px] font-semibold " +
                      (reportUnread > 0 ? "border-rose-400 bg-rose-50 text-rose-700" : "border-rose-400 text-rose-700 bg-white hover:bg-rose-50")
                    }
                    title="신고 접수된 글"
                  >
                    🚩 신고접수
                    {reportUnread > 0 ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" /> : null}
                  </Link>
                ) : null}

                {/* ✅ 쪽지함 + 점 표시 */}
                {me.userId ? (
                  <Link
                    href="/community/free/messages"
                    className="relative border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50"
                    title="쪽지함"
                  >
                    ✉ 쪽지함
                    {dmUnread > 0 ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" /> : null}
                  </Link>
                ) : null}

                {/* 알림 */}
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
                  {unread > 0 ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" /> : null}
                </button>

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

                {notiOpen ? (
                  <div className="absolute right-0 top-9 z-50 w-[320px] overflow-hidden border border-slate-300 bg-white shadow-lg">
                    <div className="border-b border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-900">알림</div>

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
                                : n.type === "dm"
                                ? `관리자 쪽지가 도착했습니다.`
                                : `${actor}님의 활동 알림이 있습니다.`;

                            const href = n.post_id ? `/community/free/${encodeURIComponent(n.post_id)}` : "/community/free";

                            return (
                              <li key={n.id} className="px-3 py-2">
                                <Link href={href} className="block hover:underline" onClick={() => setNotiOpen(false)}>
                                  <div className="text-[12px] text-slate-800">{msg}</div>
                                  <div className="mt-0.5 text-[11px] text-slate-500">{fmtNotiTime(n.created_at)}</div>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-slate-200 px-3 py-2">
                      <Link href="/community/free/all?mine=1" className="block text-[12px] font-semibold text-slate-900 hover:underline" onClick={() => setNotiOpen(false)}>
                        내가 쓴 글
                      </Link>
                      <Link href="/community/free" className="mt-1 block text-[12px] text-slate-600 hover:underline" onClick={() => setNotiOpen(false)}>
                        메인으로
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
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="게시글 검색 (제목)" className="w-full px-3 py-2 text-[12px] text-slate-900 outline-none" />
                <button type="button" aria-label="검색" className="border-l border-sky-700 bg-sky-700 px-4 text-white hover:bg-sky-600">
                  <span className="text-[16px] leading-none">🔍</span>
                </button>
              </div>
            </div>
          </div>

          {/* 상단 탭 */}
          <div className="mt-3">
            <FullBleed>
              <div className="border-t-2 border-b-2 border-sky-700 bg-white">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                  <div className="flex items-center gap-2 py-2 overflow-x-auto">
                    <TabLink href="/community/free">메인</TabLink>
                    <TabLink href="/community/free/all">전체글</TabLink>
                    <TabLink href="/community/free/meal">오늘의 급식</TabLink>
                    <div className="ml-auto shrink-0 text-[12px] text-slate-500">정렬/필터 자리</div>
                  </div>
                </div>
              </div>
            </FullBleed>
          </div>

          <div className="border-b border-slate-200 mt-3" />
        </div>

        {/* 본문 + 오른쪽 */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          <section className="md:col-span-8 lg:col-span-9 md:max-w-none md:justify-self-stretch">{children}</section>

          <aside className="hidden md:block md:col-span-4 lg:col-span-3 md:max-w-none md:justify-self-stretch">
            <div className="sticky top-6">
              <div className="border border-slate-300 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold tracking-tight text-slate-900">오늘의 TOPIC</span>
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
                        <Link href={`/community/free/${encodeURIComponent(p.id)}`} className="block border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate font-semibold text-[13px] text-slate-900">
                              #{idx + 1} {p.title}
                            </div>
                            <div className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap">조회 {p.view_count}</div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <StatPills members={members} visitors={visitors} />
              </div>

              <AnonymousChatBox me={me} />
            </div>
          </aside>
        </div>
      </main>
    </FreeCtx.Provider>
  );
}
