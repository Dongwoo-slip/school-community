"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
    <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/30 p-4 text-center">
      <div className="text-sm font-medium text-slate-300">누적 방문자수</div>
      <div className="mt-1 text-2xl font-extrabold text-emerald-300">
        {count === null ? "-" : count.toLocaleString()}
      </div>
    </div>
  );
}

export default function FreeBoardPage() {
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

  useEffect(() => {
    loadMe();
    loadPosts();
    loadVisitors();
  }, []);

  const top3 = useMemo(() => {
    const arr = [...posts].filter((p) => typeof p.id === "string" && p.id.length > 0);
    arr.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    return arr.slice(0, 3);
  }, [posts]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">자유게시판</h1>

          {me.userId && (
            <div className="mt-1 text-sm">
              <span className="text-slate-300">로그인됨:</span>{" "}
              <span className="font-semibold text-emerald-300">{me.username ?? "unknown"}</span>
              {me.role === "admin" ? <span className="ml-2 font-semibold text-amber-300">★ (Admin)</span> : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!me.userId ? (
            <>
              <Link
                className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 hover:bg-slate-900/50"
                href="/login?next=/community/free"
              >
                로그인
              </Link>
              <Link
                className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 hover:bg-slate-900/50"
                href="/signup"
              >
                회원가입
              </Link>
            </>
          ) : (
            <Link
              className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 hover:bg-slate-900/50"
              href="/logout"
            >
              로그아웃
            </Link>
          )}

          <Link className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-black hover:bg-emerald-400" href="/community/free/new">
            글쓰기
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 모바일 TOP3 */}
        <section className="lg:hidden rounded-xl border border-slate-700/70 bg-slate-900/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg font-bold">🔥 인기글 TOP 3</span>
            <span className="text-sm text-slate-300">(조회수 기준)</span>
          </div>

          {loading ? (
            <div className="text-slate-300">불러오는 중…</div>
          ) : top3.length === 0 ? (
            <div className="text-slate-300">아직 데이터가 없습니다.</div>
          ) : (
            <ul className="space-y-2">
              {top3.map((p, idx) => (
                <li key={p.id}>
                  {/* TOP3도 “하얀 hover” 방지: hover 제거 */}
                  <Link
                    href={`/community/free/${encodeURIComponent(p.id)}`}
                    className="block rounded-lg border border-slate-700 bg-slate-900/30 p-3"
                  >
                    <div className="font-semibold">
                      #{idx + 1} {p.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">
                      조회 {p.view_count} · {new Date(p.created_at).toLocaleString()}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <VisitorsBox count={visitors} />
        </section>

        {/* 글 목록 */}
        <section className="lg:col-span-8">
          {loading ? (
            <div className="text-slate-300">불러오는 중…</div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/20 p-4 text-slate-300">아직 글이 없습니다.</div>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => {
                const idOk = typeof p.id === "string" && p.id.length > 0;
                const isAdminPost = p.author?.role === "admin";
                const username = p.author?.username ?? "unknown";
                const href = idOk ? `/community/free/${encodeURIComponent(p.id)}` : "/community/free";

                // ✅ 핵심: 일반글은 hover로 색 안 바뀜 (hover 클래스 없음)
                const baseCard =
                  "block rounded-xl border p-4 transition";
                const userCard =
                  "border-slate-700/70 bg-slate-900/30";
                const adminCard =
                  "border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15"; // admin만 hover 유지

                return (
                  <li key={p.id ?? crypto.randomUUID()}>
                    <Link
                      href={href}
                      className={`${baseCard} ${isAdminPost ? adminCard : userCard}`}
                    >
                      <div className={"font-semibold " + (isAdminPost ? "text-amber-200" : "text-slate-100")}>
                        {p.title}
                      </div>

                      <div className="mt-2 text-sm text-slate-300 flex flex-wrap gap-x-2 gap-y-1">
                        <span>
                          작성자: <span className="font-medium text-slate-100">{username}</span>
                          {isAdminPost && <span className="ml-2 font-semibold text-amber-300">★ (Admin)</span>}
                        </span>
                        <span>· {new Date(p.created_at).toLocaleString()}</span>
                        <span>· 조회 {p.view_count}</span>
                        {!idOk && <span className="text-rose-300">· (id 없음: API 응답 확인 필요)</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 데스크탑 TOP3 */}
        <aside className="hidden lg:block lg:col-span-4">
          <div className="sticky top-6 rounded-xl border border-slate-700/70 bg-slate-900/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg font-bold">🔥 인기글 TOP 3</span>
              <span className="text-sm text-slate-300">(조회수 기준)</span>
            </div>

            {loading ? (
              <div className="text-slate-300">불러오는 중…</div>
            ) : top3.length === 0 ? (
              <div className="text-slate-300">아직 데이터가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {top3.map((p, idx) => (
                  <li key={p.id}>
                    {/* TOP3도 hover 제거 */}
                    <Link
                      href={`/community/free/${encodeURIComponent(p.id)}`}
                      className="block rounded-lg border border-slate-700 bg-slate-900/30 p-3"
                    >
                      <div className="font-semibold">
                        #{idx + 1} {p.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-300">조회 {p.view_count}</div>
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
