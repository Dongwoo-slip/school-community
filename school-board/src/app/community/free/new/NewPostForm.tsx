"use client";

import { useState } from "react";

export default function NewPostForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg(null);

    if (title.trim().length < 4) return setMsg("제목은 4글자 이상");
    if (content.trim().length < 4) return setMsg("본문은 4글자 이상");

    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: "free",
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(json?.error ?? "등록 실패");
        return;
      }

      const id = json?.id;
      location.href = id ? `/community/free/${id}` : "/community/free";
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3">
      <input
        className="w-full rounded border p-2"
        placeholder="제목 (4글자 이상)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="min-h-[220px] w-full rounded border p-2"
        placeholder="내용 (4글자 이상)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          disabled={loading}
          onClick={submit}
        >
          {loading ? "등록 중..." : "등록"}
        </button>
        <a className="rounded border px-4 py-2" href="/community/free">
          취소
        </a>
      </div>

      {msg && <div className="text-sm text-red-600">{msg}</div>}
    </section>
  );
}
