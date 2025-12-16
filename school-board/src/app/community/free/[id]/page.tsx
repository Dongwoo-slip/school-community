"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Me = { userId: string | null; role: string; username: string | null };

type PostDetail = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
  view_count: number | null;
  author_id?: string | null;
  author?: { username: string | null; role: string | null } | null;

  // ✅ 사진 첨부
  image_urls?: string[] | null;
};

type Comment = {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id?: string | null;
  author?: { username: string | null; role: string | null } | null;
};

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return String(iso);
  }
}

export default function FreePostDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setMe({ userId: json.userId ?? null, role: json.role ?? "guest", username: json.username ?? null });
  }

  async function loadPostAndComments() {
    if (!id) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const resPost = await fetch(`/api/posts/${encodeURIComponent(id)}`, { cache: "no-store" });
      const jsonPost = await resPost.json().catch(() => ({}));

      if (!resPost.ok) {
        setPost(null);
        setComments([]);
        setErrorMsg(jsonPost?.error ?? "게시글을 불러오지 못했습니다.");
        return;
      }

      setPost(jsonPost?.data ?? null);

      const resC = await fetch(`/api/comments?post_id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const jsonC = await resC.json().catch(() => ({}));
      setComments(jsonC?.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await fetch("/api/logout", { method: "POST" });
    setMe({ userId: null, role: "guest", username: null });
    router.refresh();
  }

  const canDelete = useMemo(() => {
    if (!me.userId || !post) return false;
    if (me.role === "admin") return true;
    if (post.author_id && String(post.author_id) === String(me.userId)) return true;
    return false;
  }, [me.userId, me.role, post]);

  async function onDeletePost() {
    if (!id) return;
    if (!confirm("정말 삭제할까요?")) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "삭제 실패");
        return;
      }
      router.push("/community/free");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onAddComment() {
    if (!id) return;

    if (!me.userId) {
      alert("로그인이 필요합니다.");
      router.push(`/login?next=/community/free/${encodeURIComponent(id)}`);
      return;
    }

    const content = commentText.trim();
    if (!content) return;

    setBusy(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, content }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "댓글 등록 실패");
        return;
      }
      setCommentText("");
      await loadPostAndComments();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadPostAndComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6">
      {/* 상단 */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/community/free" className="text-sm text-slate-200 hover:underline">
          ← 목록
        </Link>

        <div className="flex items-center gap-2">
          {!me.userId ? (
            <>
              <Link
                className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm hover:bg-slate-900/50"
                href={`/login?next=/community/free/${encodeURIComponent(id ?? "")}`}
              >
                로그인
              </Link>
              <Link
                className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm hover:bg-slate-900/50"
                href="/signup"
              >
                회원가입
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm hover:bg-slate-900/50"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* 게시글 카드 */}
      <section className="rounded-xl border border-slate-700/70 bg-slate-900/30 p-4 sm:p-6">
        {loading ? (
          <div className="text-slate-300 text-sm">불러오는 중…</div>
        ) : errorMsg ? (
          <div className="text-rose-300 text-sm">{errorMsg}</div>
        ) : !post ? (
          <div className="text-slate-300 text-sm">게시글이 없습니다.</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 break-words">
                  {post.title ?? "(제목 없음)"}
                </h1>

                <div className="mt-2 text-xs sm:text-sm text-slate-300 flex flex-wrap gap-x-2 gap-y-1">
                  <span>
                    작성자:{" "}
                    <span className="font-medium text-slate-100">{post.author?.username ?? "unknown"}</span>
                    {post.author?.role === "admin" ? (
                      <span className="ml-2 font-semibold text-amber-300">★ (Admin)</span>
                    ) : null}
                  </span>
                  <span>· {fmt(post.created_at)}</span>
                  <span>· 조회 {post.view_count ?? 0}</span>
                </div>
              </div>

              {canDelete ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDeletePost}
                  className="shrink-0 rounded-lg border border-rose-700/50 bg-rose-900/20 px-3 py-2 text-sm text-rose-200 hover:bg-rose-900/30 disabled:opacity-50"
                >
                  삭제
                </button>
              ) : null}
            </div>

            {/* 본문 */}
            <div className="mt-5 rounded-xl border border-slate-700/70 bg-slate-950/20 p-4 text-slate-100 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {post.content ?? ""}
            </div>

            {/* ✅ 첨부 이미지 */}
            {Array.isArray(post.image_urls) && post.image_urls.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {post.image_urls.map((url, i) => (
                  <a
                    key={url + i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/10"
                  >
                    <img
                      src={url}
                      alt={`첨부 이미지 ${i + 1}`}
                      className="h-auto w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* 댓글 */}
      <section className="mt-5 rounded-xl border border-slate-700/70 bg-slate-900/20 p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">댓글</h2>
          <div className="text-sm text-slate-300">{comments.length}개</div>
        </div>

        {/* 입력 */}
        <div className="rounded-xl border border-slate-700/70 bg-slate-900/30 p-3 sm:p-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={me.userId ? "댓글을 입력하세요" : "댓글 작성은 로그인 후 가능합니다"}
            disabled={!me.userId || busy}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/30 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            rows={4}
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onAddComment}
              disabled={!me.userId || busy || commentText.trim().length === 0}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              등록
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div className="mt-4 space-y-3">
          {comments.length === 0 ? (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/20 p-4 text-sm text-slate-300">
              아직 댓글이 없습니다.
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-700/70 bg-slate-900/30 p-4">
                <div className="text-xs sm:text-sm text-slate-300 flex flex-wrap gap-x-2 gap-y-1">
                  <span>
                    작성자:{" "}
                    <span className="font-medium text-slate-100">{c.author?.username ?? "unknown"}</span>
                    {c.author?.role === "admin" ? (
                      <span className="ml-2 font-semibold text-amber-300">★ (Admin)</span>
                    ) : null}
                  </span>
                  <span>· {fmt(c.created_at)}</span>
                </div>

                <div className="mt-2 text-sm text-slate-100 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {c.content}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
