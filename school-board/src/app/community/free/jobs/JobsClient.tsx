"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFreeBoard } from "../layout";

type JobPost = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
  tags: string[];
  author_id: string | null;
  author?: { username: string | null; role: string | null } | null;
};

const GROUPS: { title: string; items: string[] }[] = [
  { title: "🧪 과학", items: ["물리", "화학", "생명과학", "지구과학"] },
  { title: "💻 수학/정보", items: ["수학", "컴공", "AI/데이터", "로봇"] },
  { title: "📚 인문/사회", items: ["사회", "경제"] },
  { title: "🎨 진로/기타", items: ["의료보건", "교사/교육", "디자인", "영상", "음악", "미술", "체육"] },
  { title: "🏃 활동", items: ["대회/공모전", "스터디", "프로젝트", "봉사"] },
];

function fmtCompactDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: any;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 text-xs font-bold transition-all " +
        (active
          ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
          : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 focus:outline-none")
      }
    >
      {children}
    </button>
  );
}

export default function JobsClient() {
  const { query, me } = useFreeBoard();

  const [posts, setPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [before, setBefore] = useState<string | null>(null);
  const [tag, setTag] = useState<string>("");

  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function loadMeInterests() {
    const res = await fetch("/api/me", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setMyInterests(Array.isArray(json?.interests) ? json.interests : []);
  }

  async function saveInterests(next: string[]) {
    setSaveMsg(null);
    const res = await fetch("/api/me/interests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interests: next }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaveMsg(json?.error ?? "저장 실패");
      return;
    }
    setMyInterests(Array.isArray(json?.interests) ? json.interests : next);
    setSaveMsg("저장 완료!");
    setTimeout(() => setSaveMsg(null), 1500);
  }

  function toggleMyInterest(x: string) {
    if (!me.userId) return;
    const next = myInterests.includes(x) ? myInterests.filter((v) => v !== x) : [...myInterests, x];
    setMyInterests(next);
    saveInterests(next);
  }

  const effectiveQ = query.trim();

  async function loadFirst() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "40");
      if (tag) qs.set("tag", tag);
      if (effectiveQ) qs.set("q", effectiveQ);

      const res = await fetch(`/api/jobs?${qs.toString()}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      const arr: JobPost[] = Array.isArray(json?.data) ? json.data : [];
      setPosts(arr);
      setHasMore(Boolean(json?.hasMore));
      setBefore(arr.length ? arr[arr.length - 1].created_at : null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!before || busy) return;
    setBusy(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "40");
      qs.set("before", before);
      if (tag) qs.set("tag", tag);
      if (effectiveQ) qs.set("q", effectiveQ);

      const res = await fetch(`/api/jobs?${qs.toString()}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      const more: JobPost[] = Array.isArray(json?.data) ? json.data : [];

      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...more.filter((p) => !seen.has(p.id))];
      });

      setHasMore(Boolean(json?.hasMore));
      setBefore(more.length ? more[more.length - 1].created_at : before);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, effectiveQ]);

  useEffect(() => {
    loadMeInterests();
  }, [me.userId]);

  const myInterestSet = useMemo(() => new Set(myInterests), [myInterests]);

  return (
    <div className="space-y-8">
      {/* Search & Filter Header */}
      <section className="glass rounded-[2rem] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <span className="text-3xl">🤝</span> 구인구직
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">
              Find your partners & collaborators
            </p>
          </div>
          <Link href="/community/free/jobs/new" className="btn-primary py-3 px-8 text-sm self-start lg:self-center">
            모집글 올리기
          </Link>
        </div>

        <div className="mt-8">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
            Interest Filter
          </h3>
          <div className="flex flex-wrap gap-2">
            <Chip active={tag === ""} onClick={() => setTag("")}>전체</Chip>
            {GROUPS.flatMap((g) => g.items).map((x) => (
              <Chip key={x} active={tag === x} onClick={() => setTag(tag === x ? "" : x)}>
                {x}
              </Chip>
            ))}
          </div>
        </div>

        {/* My Interests Quick Select */}
        <div className="mt-8 rounded-2xl bg-white/[0.03] p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">
              My Custom Interests
            </h4>
            {saveMsg && <span className="text-[10px] font-bold text-emerald-400 animate-pulse">{saveMsg}</span>}
          </div>
          <div className="space-y-4">
            {GROUPS.map((g) => (
              <div key={g.title} className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase">{g.title}</span>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((x) => (
                    <button
                      key={x}
                      onClick={() => toggleMyInterest(x)}
                      className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all ${myInterestSet.has(x)
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                          : "bg-white/[0.02] text-slate-500 border border-transparent hover:bg-white/5"
                        }`}
                    >
                      {myInterestSet.has(x) ? "✓ " : "+ "}{x}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content List */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-[2rem] p-20 text-center">
            <div className="text-5xl mb-6">🏜️</div>
            <p className="text-sm font-medium text-slate-500">
              아직 {effectiveQ || tag ? "조건에 맞는" : ""} 구인 글이 없습니다.<br />
              직접 새로운 모집을 시작해보세요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((p) => {
              const username = p.author?.username ?? "unknown";
              const date = fmtCompactDate(p.created_at);
              const tags = Array.isArray(p.tags) ? p.tags : [];

              return (
                <Link
                  key={p.id}
                  href={`/community/free/${p.id}`}
                  className="glass-hover group flex flex-col justify-between rounded-2xl bg-white/[0.03] p-6 transition-all hover:bg-white/10"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{date}</span>
                      <span className="text-[10px] font-bold text-slate-600">👤 {username}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-200 group-hover:text-sky-400 line-clamp-2 leading-snug">
                      {p.title}
                    </h3>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {tags.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-lg bg-sky-500/10 px-2 py-0.5 text-[9px] font-black text-sky-400/80 uppercase">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            className="btn-secondary w-full py-4 mt-4"
            onClick={loadMore}
            disabled={busy}
          >
            {busy ? "LOADING..." : "SHOW MORE"}
          </button>
        )}
      </div>
    </div>
  );
}
