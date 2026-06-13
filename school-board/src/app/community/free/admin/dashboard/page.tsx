"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type PostRow = {
  id: string;
  board: string | null;
  title: string | null;
  created_at: string | null;
  view_count: number | null;
  like_count: number | null;
  author_username: string | null;
};

type ReportRow = {
  id: string;
  actor_username: string | null;
  post_id: string | null;
  created_at: string | null;
  read: boolean | null;
};

type UserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type DashboardData = {
  generated_at: string;
  today_start: string;
  cards: Record<string, number>;
  recentPosts: PostRow[];
  topPosts: PostRow[];
  recentReports: ReportRow[];
  recentUsers: UserRow[];
};

const cardLabels: { key: string; label: string; tone?: "red" | "blue" | "green" }[] = [
  { key: "totalUsers", label: "전체 회원", tone: "blue" },
  { key: "totalVisits", label: "누적 방문", tone: "blue" },
  { key: "todayVisits", label: "오늘 방문", tone: "green" },
  { key: "visiblePosts", label: "노출 글" },
  { key: "archivedPosts", label: "보관 글" },
  { key: "postsToday", label: "오늘 새글", tone: "green" },
  { key: "commentsToday", label: "오늘 댓글", tone: "green" },
  { key: "unreadReportNotis", label: "미확인 신고", tone: "red" },
  { key: "unreadPrivateMessages", label: "안 읽은 쪽지", tone: "red" },
  { key: "chatToday", label: "오늘 채팅" },
  { key: "deletedLogs", label: "삭제 로그" },
  { key: "editLogs", label: "수정 로그" },
  { key: "activePopups", label: "활성 팝업" },
];

const quickLinks = [
  { href: "/community/free/reports", label: "신고함" },
  { href: "/community/free/admin/archive", label: "보관함" },
  { href: "/community/free/admin/deleted", label: "삭제 로그" },
  { href: "/community/free/admin/edits", label: "수정 로그" },
  { href: "/community/free/admin/popup", label: "팝업 관리" },
  { href: "/community/free/admin/ad", label: "광고 관리" },
  { href: "/community/free/admin/dday", label: "D-Day 관리" },
  { href: "/community/free/admin/verified", label: "인증 목록" },
  { href: "/community/free/admin/dm", label: "관리자 쪽지" },
];

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function n(v: unknown) {
  const num = Number(v ?? 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "red" | "blue" | "green" }) {
  const toneClass =
    tone === "red"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "blue"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`border p-3 ${toneClass}`}>
      <div className="text-[11px] font-black uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-black">{n(value)}</div>
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border border-slate-300 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-[14px] font-black text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PostList({ rows, empty }: { rows: PostRow[]; empty: string }) {
  if (!rows.length) return <div className="p-4 text-[12px] font-medium text-slate-500">{empty}</div>;
  return (
    <div className="divide-y divide-slate-100">
      {rows.map((p) => (
        <Link key={p.id} href={`/community/free/${p.id}`} prefetch={false} className="block px-4 py-3 hover:bg-slate-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-black text-slate-950">{p.title || "제목 없음"}</div>
              <div className="mt-1 text-[11px] font-bold text-slate-500">
                {p.author_username || "익명"} · {p.board || "free"} · {fmt(p.created_at)}
              </div>
            </div>
            <div className="shrink-0 text-right text-[11px] font-bold text-slate-500">
              <div>조회 {n(p.view_count)}</div>
              <div>추천 {n(p.like_count)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "불러오기 실패");
      setData(json.data);
    } catch (e: any) {
      setError(e?.message ?? "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cards = useMemo(() => data?.cards ?? {}, [data]);

  if (loading) return <div className="border border-slate-300 bg-white p-5 text-sm font-bold text-slate-600">관리자 통계를 불러오는 중...</div>;

  if (error) {
    return (
      <div className="border border-rose-200 bg-rose-50 p-5">
        <div className="text-sm font-black text-rose-700">{error}</div>
        <button type="button" onClick={load} className="mt-3 border border-rose-300 bg-white px-3 py-2 text-[12px] font-black text-rose-700">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="border border-slate-300 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[12px] font-black uppercase tracking-widest text-sky-700">Admin Dashboard</div>
            <h1 className="mt-1 text-[20px] font-black text-slate-950">운영 통계</h1>
            <p className="mt-1 text-[12px] font-medium text-slate-500">오늘 기준은 한국시간 00:00부터입니다.</p>
          </div>
          <button type="button" onClick={load} className="btn-primary px-4 py-2 text-[12px]">
            새로고침
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cardLabels.map((c) => (
          <StatCard key={c.key} label={c.label} value={cards[c.key] ?? 0} tone={c.tone} />
        ))}
      </div>

      <Panel title="빠른 관리">
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          {quickLinks.map((x) => (
            <Link key={x.href} href={x.href} className="border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[12px] font-black text-slate-800 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800">
              {x.label}
            </Link>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="최근 글" action={<span className="text-[11px] font-bold text-slate-500">최신 8개</span>}>
          <PostList rows={data?.recentPosts ?? []} empty="최근 글이 없습니다." />
        </Panel>

        <Panel title="인기 글" action={<span className="text-[11px] font-bold text-slate-500">조회수 기준</span>}>
          <PostList rows={data?.topPosts ?? []} empty="인기 글이 없습니다." />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="최근 신고" action={<Link href="/community/free/reports" className="text-[11px] font-black text-sky-700">신고함</Link>}>
          {data?.recentReports?.length ? (
            <div className="divide-y divide-slate-100">
              {data.recentReports.map((r) => (
                <Link key={r.id} href={r.post_id ? `/community/free/${r.post_id}` : "/community/free/reports"} prefetch={false} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div>
                    <div className="text-[13px] font-black text-slate-950">{r.actor_username || "익명"} 신고</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-500">{fmt(r.created_at)}</div>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-black ${r.read ? "bg-slate-100 text-slate-500" : "bg-rose-100 text-rose-700"}`}>
                    {r.read ? "확인" : "미확인"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-[12px] font-medium text-slate-500">최근 신고가 없습니다.</div>
          )}
        </Panel>

        <Panel title="최근 가입">
          {data?.recentUsers?.length ? (
            <div className="divide-y divide-slate-100">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="px-4 py-3">
                  <div className="truncate text-[13px] font-black text-slate-950">{u.email || u.id}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    가입 {fmt(u.created_at)} · 최근 접속 {fmt(u.last_sign_in_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-[12px] font-medium text-slate-500">최근 가입 정보가 없습니다.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
