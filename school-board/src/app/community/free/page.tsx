"use client";

import { useEffect, useState } from "react";

type Post = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
};

export default function FreeBoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/posts?board=free");
    const json = await res.json();
    setPosts(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">자유게시판</h1>
        <a className="rounded bg-black px-3 py-2 text-white" href="/community/free/new">
          글쓰기
        </a>
      </div>

      {loading ? (
        <div className="mt-6 text-gray-600">불러오는 중…</div>
      ) : posts.length === 0 ? (
        <div className="mt-6 rounded border p-4 text-gray-600">아직 글이 없습니다.</div>
      ) : (
        <ul className="mt-6 space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded border p-4">
              <a className="font-semibold" href={`/community/free/${p.id}`}>
                {p.title}
              </a>
              <div className="mt-1 text-sm text-gray-500">
                {new Date(p.created_at).toLocaleString()} · 조회 {p.view_count}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
