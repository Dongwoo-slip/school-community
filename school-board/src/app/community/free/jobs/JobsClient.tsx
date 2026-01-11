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
  { title: "과학", items: ["물리", "화학", "생명과학", "지구과학"] },
  { title: "수학/정보", items: ["수학", "컴공", "AI/데이터", "로봇"] },
  { title: "인문/사회", items: ["사회", "경제"] },
  { title: "진로/기타", items: ["의료보건", "교사/교육", "디자인", "영상", "음악", "미술", "체육"] },
  { title: "활동", items: ["대회/공모전", "스터디", "프로젝트", "봉사"] },
];

function fmtCompactDate(iso: string) {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}/${mm}/${dd}`;
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
        "border px-2 py-1 text-[11px] font-semibold whitespace-nowrap " +
        (active
          ? "border-sky-700 bg-sky-700 text-white"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50")
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

  // 내 관심사
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
    // 자동 저장(원하면 버튼 저장으로 바꿀 수 있음)
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
    <>
      <div className="mb-4 border border-slate-400 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-[15px] font-extrabold text-slate-900">구인구직</div>
          <div className="mt-1 text-[12px] text-slate-600">
            과제/프로젝트 같이할 사람, 스터디, 대회 팀원, 관심사 공유 등 자유롭게 모집할 수 있어요.
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="text-[12px] font-bold text-slate-900">관심사 필터</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={tag === ""} onClick={() => setTag("")}>전체</Chip>
            {GROUPS.flatMap((g) => g.items).map((x) => (
              <Chip key={x} active={tag === x} onClick={() => setTag(tag === x ? "" : x)}>
                {x}
              </Chip>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-bold text-slate-900">나의 관심사</div>
              {!me.userId ? (
                <div className="text-[11px] text-slate-500">로그인하면 저장할 수 있어요</div>
              ) : saveMsg ? (
                <div className="text-[11px] text-emerald-600">{saveMsg}</div>
              ) : (
                <div className="text-[11px] text-slate-500">눌러서 선택/해제 (자동 저장)</div>
              )}
            </div>

            <div className="mt-2 space-y-2">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <div className="text-[11px] font-semibold text-slate-600">{g.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {g.items.map((x) => (
                      <Chip
                        key={x}
                        active={myInterestSet.has(x)}
                        onClick={() => toggleMyInterest(x)}
                      >
                        {x}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Link
              href="/community/free/jobs/new"
              className="border border-emerald-400 bg-emerald-300 px-3 py-2 text-[12px] font-semibold text-black hover:bg-emerald-200"
            >
              글쓰기
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-600 text-sm">불러오는 중…</div>
      ) : posts.length === 0 ? (
        <div className="border border-slate-300 bg-white p-4 text-slate-700 text-sm">
          {effectiveQ ? "검색 결과가 없습니다." : "아직 구인구직 글이 없습니다."}
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-400 bg-white">
          <div className="border-b border-slate-400 bg-white">
            <div className="grid grid-cols-12 items-center px-3 py-2 text-[11px] font-semibold text-slate-900">
              <div className="col-span-7 sm:col-span-8">제목</div>
              <div className="hidden sm:block sm:col-span-2">작성자</div>
              <div className="col-span-3 sm:col-span-2 text-right">작성일</div>
            </div>
          </div>

          <ul className="divide-y divide-slate-200">
            {posts.map((p) => {
              const href = `/community/free/${encodeURIComponent(p.id)}`; // 기존 상세페이지 재사용
              const username = p.author?.username ?? "unknown";
              const date = fmtCompactDate(p.created_at);
              const tags = Array.isArray(p.tags) ? p.tags : [];

              return (
                <li key={p.id} className="hover:bg-slate-50">
                  <div className="grid grid-cols-12 items-start gap-2 px-3 py-2.5">
                    <div className="col-span-7 sm:col-span-8 min-w-0">
                      <Link href={href} className="block min-w-0 truncate font-semibold text-slate-900" title={p.title}>
                        {p.title}
                      </Link>
                      {tags.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tags.slice(0, 6).map((t) => (
                            <span key={t} className="border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                              #{t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="hidden sm:block sm:col-span-2 min-w-0 truncate text-slate-800 text-[12px]">
                      {username}
                    </div>

                    <div className="col-span-3 sm:col-span-2 text-right text-[12px] text-slate-700">
                      {date}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-slate-200 p-3">
            {hasMore ? (
              <button
                type="button"
                className="w-full border border-slate-300 bg-white py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                onClick={loadMore}
                disabled={busy}
              >
                {busy ? "불러오는 중…" : "더 보기"}
              </button>
            ) : (
              <div className="text-center text-[11px] text-slate-400">끝</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
