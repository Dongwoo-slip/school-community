"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFreeBoard } from "../layout";
import { formatAdminStudentLabel, type AuthorIdentity } from "@/lib/authorDisplay";

type JobPost = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
  tags: string[];
  author_id: string | null;
  author?: AuthorIdentity | null;
};

const GROUPS: { title: string; items: string[] }[] = [
  { title: "과학", items: ["물리", "화학", "생명과학", "지구과학"] },
  { title: "수학/정보", items: ["수학", "컴공", "AI/데이터", "로봇"] },
  { title: "인문/사회", items: ["사회", "경제"] },
  { title: "진로/기타", items: ["의료보건", "교사/교육", "디자인", "영상", "음악", "미술", "체육"] },
  { title: "활동", items: ["대회/공모전", "스터디", "프로젝트", "봉사"] },
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
        "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors " +
        (active
          ? "border-sky-300 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 focus:outline-none")
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
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold leading-tight text-slate-950">
              구인구직
            </h2>
            <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
              스터디, 프로젝트, 대회 팀원을 조용하게 찾는 공간입니다.
            </p>
          </div>
          <Link href="/community/free/jobs/new" className="btn-primary self-start px-4 py-2 text-[12px] sm:self-center">
            모집글 올리기
          </Link>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-[11px] font-bold text-slate-600">
            관심 분야로 보기
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

        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-slate-700">
              내 관심사 저장
            </h4>
            {saveMsg && <span className="text-[10px] font-bold text-emerald-700">{saveMsg}</span>}
          </div>
          <div className="space-y-3">
            {GROUPS.map((g) => (
              <div key={g.title} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-slate-500">{g.title}</span>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((x) => (
                    <button
                      key={x}
                      onClick={() => toggleMyInterest(x)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${myInterestSet.has(x)
                          ? "border-sky-300 bg-white text-sky-800"
                          : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white"
                        }`}
                    >
                      {myInterestSet.has(x) ? "✓ " : "+ "}{x}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {!me.userId ? (
            <p className="mt-3 text-[11px] font-medium text-slate-500">
              로그인하면 관심사를 저장해서 다음에도 빠르게 볼 수 있어요.
            </p>
          ) : null}
        </div>
      </section>

      <div className="space-y-4">
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border border-slate-100 bg-white" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-medium leading-6 text-slate-500">
              아직 {effectiveQ || tag ? "조건에 맞는" : ""} 구인 글이 없습니다.<br />
              직접 새로운 모집을 시작해보세요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {posts.map((p) => {
              const username = p.author?.username ?? "unknown";
              const date = fmtCompactDate(p.created_at);
              const tags = Array.isArray(p.tags) ? p.tags : [];

              return (
                <Link
                  key={p.id}
                  href={`/community/free/${p.id}`}
                  prefetch={false}
                  className="group flex min-h-[8.4rem] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-slate-500">{date}</span>
                      <span className="truncate text-[10px] font-medium text-slate-500">
                        {username}
                        {me.role === "admin" ? ` · ${formatAdminStudentLabel(p.author)}` : ""}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-[0.92rem] font-semibold leading-snug text-slate-900 group-hover:text-sky-800">
                      {p.title}
                    </h3>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tags.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
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
            className="btn-secondary mt-4 w-full py-3 text-[12px]"
            onClick={loadMore}
            disabled={busy}
          >
            {busy ? "불러오는 중..." : "더 보기"}
          </button>
        )}
      </div>
    </div>
  );
}
