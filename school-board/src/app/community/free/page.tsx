"use client";

import { useEffect, useState } from "react";

type Post = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
  author_id: string | null;
  author?: { username: string | null; role: string | null };
};

type Me = { userId: string | null; role: string; username: string | null };

export default function FreeBoardPage() {
  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadMe();
    loadPosts();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">자유게시판</h1>
          {me.userId && (
            <div className="mt-1 text-sm text-gray-600">
              로그인됨: <span className="font-semibold">{me.username ?? "unknown"}</span>
              {me.role === "admin" ? " (admin)" : ""}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!me.userId ? (
            <>
              <a className="rounded border px-3 py-2" href="/login?next=/community/free">로그인</a>
              <a className="rounded border px-3 py-2" href="/signup">회원가입</a>
            </>
          ) : (
            <a className="rounded border px-3 py-2" href="/logout">로그아웃</a>
          )}

          <a className="rounded bg-black px-3 py-2 text-white" href="/community/free/new">
            글쓰기
          </a>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-gray-600">불러오는 중…</div>
      ) : posts.length === 0 ? (
        <div className="mt-6 rounded border p-4 text-gray-600">아직 글이 없습니다.</div>
      ) : (
        <ul className="mt-6 space-y-3">
          {posts.map((p) => {
            const isAdminPost = p.author?.role === "admin";
            const username = p.author?.username ?? "unknown";

            return (
              <li
                key={p.id}
                className={
                  "rounded border p-4 " +
                  (isAdminPost ? "border-amber-300 bg-amber-50" : "")
                }
              >
                <a
                  className={"font-semibold " + (isAdminPost ? "text-amber-900" : "")}
                  href={`/community/free/${p.id}`}
                >
                  {p.title}
                </a>

                <div className="mt-2 text-sm text-gray-500 flex flex-wrap gap-x-2 gap-y-1">
                  <span>
                    작성자: <span className="font-medium text-gray-700">{username}</span>
                    {isAdminPost && (
                      <span className="ml-2 font-semibold text-amber-700">★ (Admin)</span>
                    )}
                  </span>
                  <span>· {new Date(p.created_at).toLocaleString()}</span>
                  <span>· 조회 {p.view_count}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
