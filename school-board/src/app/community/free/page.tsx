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
    <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/30 p-4 text-center">
      <div className="text-sm font-medium text-slate-300">누적 방문수</div>
      <div className="mt-1 text-2xl font-extrabold text-emerald-300">
        {count === null ? "-" : count.toLocaleString()}
      </div>
    </div>
  );
}

function NumberBadge({ n }: { n: number }) {
  return (
    <div className="shrink-0">
      <div className="inline-flex min-w-7 items-center justify-center rounded-md bg-rose-800/90 px-2 py-1 text-xs font-bold text-white ring-1 ring-rose-700/40">
        {n}
      </div>
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

  const top3 = useMemo(() => {
    const arr = [...posts].filter((p) => typeof p.id === "string" && p.id.length > 0);
    arr.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    return arr.slice(0, 3);
  }, [posts]);

  const numberMap = useMemo(() => {
    const arr = [...posts].filter((p) => typeof p.id === "string" && p.id.length > 0);
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const map = new Map<string, number>();
    arr.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }, [posts]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6">
      {/* ✅ 둥근 파란 배너만(사각형 느낌 제거) */}
      <div className="relative mt-4 mb-7">
        {/* 배경 둥근 도형(위쪽이 살짝 잘려 보이는 효과, 각짐 방지: overflow-hidden 없음) */}
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-44 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-900" />

        {/* 실제 배너 */}
        <div className="relative rounded-full bg-sky-600 px-5 py-5 sm:px-7 sm:py-6 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">자유게시판</h1>

              {me.userId ? (
                <div className="text-xs sm:text-sm">
                  <span className="text-white/85">로그인됨:</span>{" "}
                  <span className="font-semibold text-emerald-200">{me.username ?? "unknown"}</span>
                  {me.role === "admin" ? <span className="ml-2 font-semibold text-amber-200">★ (Admin)</span> : null}
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-white/80">로그인되지 않음</div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!me.userId ? (
                <>
                  <Link
                    className="rounded-lg bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
                    href="/login?next=/community/free"
                  >
                    로그인
                  </Link>
                  <Link
                    className="rounded-lg bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
                    href="/signup"
                  >
                    회원가입
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
                >
                  로그아웃
                </button>
              )}

              <Link
                className="rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-200"
                href="/community/free/new"
              >
                글쓰기
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 sm:mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 모바일 TOP3 */}
        <section className="lg:hidden rounded-xl border border-slate-700/70 bg-slate-900/20 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold">🔥 인기글 TOP 3</span>
            <span className="text-xs sm:text-sm text-slate-300">(조회수 기준)</span>
          </div>

          {loading ? (
            <div className="text-slate-300 text-sm">불러오는 중…</div>
          ) : top3.length === 0 ? (
            <div className="text-slate-300 text-sm">아직 데이터가 없습니다.</div>
          ) : (
            <ul className="space-y-2">
              {top3.map((p, idx) => (
                <li key={p.id}>
                  <Link
                    href={`/community/free/${encodeURIComponent(p.id)}`}
                    className="block rounded-lg border border-slate-700 bg-slate-900/30 p-3"
                  >
                    <div className="font-semibold text-sm sm:text-base">
                      #{idx + 1} {p.title}
                    </div>
                    <div className="mt-1 text-xs sm:text-sm text-slate-300">
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
            <div className="text-slate-300 text-sm">불러오는 중…</div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/20 p-4 text-slate-300 text-sm">
              아직 글이 없습니다.
            </div>
          ) : (
            <ul className="space-y-2 sm:space-y-3">
              {posts.map((p) => {
                const idOk = typeof p.id === "string" && p.id.length > 0;
                const isAdminPost = p.author?.role === "admin";
                const username = p.author?.username ?? "unknown";
                const href = idOk ? `/community/free/${encodeURIComponent(p.id)}` : "/community/free";
                const n = idOk ? numberMap.get(p.id) : undefined;

                const baseCard = "block rounded-xl border transition";
                const pad = "p-3 sm:p-4";
                const userCard = "border-slate-700/70 bg-slate-900/30";
                const adminCard = "border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15";

                return (
                  <li key={p.id ?? crypto.randomUUID()}>
                    <Link href={href} className={`${baseCard} ${pad} ${isAdminPost ? adminCard : userCard}`}>
                      <div className="flex items-start gap-3">
                        {typeof n === "number" ? <NumberBadge n={n} /> : null}

                        <div className="min-w-0 flex-1">
                          <div
                            className={
                              "font-semibold text-sm sm:text-base " +
                              (isAdminPost ? "text-amber-200" : "text-slate-100")
                            }
                          >
                            {p.title}
                          </div>

                          <div className="mt-2 text-xs sm:text-sm text-slate-300 flex flex-wrap gap-x-2 gap-y-1">
                            <span>
                              작성자: <span className="font-medium text-slate-100">{username}</span>
                              {isAdminPost && <span className="ml-2 font-semibold text-amber-300">★ (Admin)</span>}
                            </span>
                            <span>· {new Date(p.created_at).toLocaleString()}</span>
                            <span>· 조회 {p.view_count}</span>
                            {!idOk && <span className="text-rose-300">· (id 없음: API 응답 확인 필요)</span>}
                          </div>
                        </div>
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
