"use client";

import { useEffect, useMemo, useState } from "react";

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { username: string | null; role: string | null };
};

export default function Comments({
  postId,
  meUserId,
  meRole,
}: {
  postId: string;
  meUserId: string | null;
  meRole: string;
}) {
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    // ✅ post_id로 통일
    const res = await fetch(`/api/comments?post_id=${encodeURIComponent(postId)}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setItems(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const canDelete = useMemo(() => {
    return (c: CommentRow) => {
      if (!meUserId) return false;
      if (meRole === "admin") return true;
      return c.author_id === meUserId;
    };
  }, [meUserId, meRole]);

  async function submit() {
    setMsg(null);
    if (!meUserId) return setMsg("댓글 작성은 로그인 후 가능합니다.");

    const text = content.trim();
    if (text.length < 1) return setMsg("댓글을 입력하세요.");
    if (text.length > 500) return setMsg("댓글은 500자 이하");

    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, content: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(json?.error ?? "댓글 등록 실패");

      setContent("");
      await load();
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("댓글을 삭제할까요?")) return;

    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return alert(json?.error ?? "삭제 실패");

    await load();
  }

  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-lg font-extrabold text-slate-950">댓글</h2>

      <div className="rounded-2xl border border-black/15 bg-white p-3 shadow-sm space-y-2">
        <textarea
          className="min-h-[84px] w-full rounded-xl border border-black/15 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          placeholder={meUserId ? "댓글을 입력하세요 (500자 이하)" : "댓글 작성은 로그인 후 가능합니다."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!meUserId || posting}
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-600">{content.trim().length}/500</div>
          <button
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            onClick={submit}
            disabled={!meUserId || posting}
          >
            {posting ? "등록 중..." : "댓글 등록"}
          </button>
        </div>
        {msg && <div className="text-sm text-rose-600">{msg}</div>}
      </div>

      {loading ? (
        <div className="text-slate-600">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-black/15 bg-white p-4 text-slate-600 shadow-sm">아직 댓글이 없습니다.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => {
            const username = c.author?.username ?? "unknown";
            const isAdminAuthor = c.author?.role === "admin";
            const avatar = (username?.[0] ?? "?").toUpperCase();

            return (
              <li key={c.id} className="rounded-2xl border border-black/15 bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full border border-black/15 bg-sky-50 flex items-center justify-center font-bold text-slate-900">
                    {avatar}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-950">{username}</span>
                        {isAdminAuthor && <span className="ml-2 text-sm font-semibold text-amber-600">★ (Admin)</span>}
                        <span className="ml-2 text-xs text-slate-600">{new Date(c.created_at).toLocaleString()}</span>
                      </div>

                      {canDelete(c) && (
                        <button className="text-sm font-semibold text-rose-600 hover:underline" onClick={() => remove(c.id)}>
                          삭제
                        </button>
                      )}
                    </div>

                    <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-900">{c.content}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
