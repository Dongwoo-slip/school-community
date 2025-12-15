"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!id) return;

    (async () => {
      const res = await fetch(`/api/posts/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error ?? "불러오기 실패");
        return;
      }
      setData(json.data);
    })();
  }, [id]);

  if (err) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <a className="text-sm underline" href="/community/free">← 목록</a>
        <div className="mt-6 rounded border p-4 text-red-600">{err}</div>
      </main>
    );
  }

  if (!data) return <main className="mx-auto max-w-3xl p-6">불러오는 중…</main>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-3">
      <a className="text-sm underline" href="/community/free">← 목록</a>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <a className="text-sm underline text-red-600" href={`/community/free/${id}/delete`}>
          삭제
        </a>
      </div>

      <div className="text-sm text-gray-500">
        {new Date(data.created_at).toLocaleString()} · 조회 {data.view_count}
      </div>

      <article className="whitespace-pre-wrap rounded border p-4">{data.content}</article>
    </main>
  );
}
