"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Me = { userId: string | null; role: string; username: string | null };

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  view_count: number;
  author_id: string | null;
  author?: { username: string | null; role: string | null } | null;
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author?: { username: string | null; role: string | null } | null;
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });

  const [post, setPost] = useState<Post | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postErr, setPostErr] = useState("");

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsErr, setCommentsErr] = useState("");

  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setMe({
      userId: json.userId ?? null,
      role: json.role ?? "guest",
      username: json.username ?? null,
    });
  }

  async function loadPost(postId: string) {
    setPostLoading(true);
    setPostErr("");

    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPostErr(json?.error ?? "불러오기 실패");
      setPost(null);
      setPostLoading(false);
      return;
    }

    setPost(json.data ?? null);
    setPostLoading(false);
  }

  async function loadComments(postId: string) {
    setCommentsLoading(true);
    setCommentsErr("");

    const res = await fetch(`/api/comments?post_id=${encodeURIComponent(postId)}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setCommentsErr(json?.error ?? "댓글 불러오기 실패");
      setComments([]);
      setCommentsLoading(false);
      return;
    }

    setComments(json.data ?? []);
    setCommentsLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    loadMe();
    loadPost(id);
    loadComments(id);
  }, [id]);

  async function submitComment() {
    if (!id) return;

    if (!me.userId) {
      alert("댓글 작성은 로그인 후 가능합니다.");
      return;
    }

    const content = newComment.trim();
    if (content.length < 1) {
      alert("댓글을 입력하세요.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: id, content }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      alert(json?.error ?? "댓글 등록 실패");
      return;
    }

    setNewComment("");
    loadComments(id);
  }

  async function deleteComment(commentId: string) {
    if (!confirm("댓글을 삭제할까요?")) return;

    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(json?.error ?? "댓글 삭제 실패");
      return;
    }

    if (id) loadComments(id);
  }

  if (postLoading) {
    return <main className="mx-auto max-w-3xl p-6">불러오는 중…</main>;
  }

  if (postErr) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link className="text-sm underline" href="/community/free">
          ← 목록
        </Link>
        <div className="mt-6 rounded border p-4 text-red-600">{postErr}</div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link className="text-sm underline" href="/community/free">
          ← 목록
        </Link>
        <div className="mt-6 rounded border p-4 text-gray-600">게시글이 없습니다.</div>
      </main>
    );
  }

  const isAdminPost = post.author?.role === "admin";
  const postAuthorName = post.author?.username ?? "unknown";

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      {/* 상단 */}
      <div className="flex items-center justify-between gap-3">
        <Link className="text-sm underline" href="/community/free">
          ← 목록
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {!me.userId ? (
            <>
              <Link className="rounded border px-3 py-2 text-sm" href={`/login?next=/community/free/${encodeURIComponent(post.id)}`}>
                로그인
              </Link>
              <Link className="rounded border px-3 py-2 text-sm" href="/signup">
                회원가입
              </Link>
            </>
          ) : (
            <div className="text-sm">
              <span className="text-gray-500">로그인됨:</span>{" "}
              <span className="font-semibold text-emerald-500">{me.username ?? "unknown"}</span>
              {me.role === "admin" ? <span className="ml-2 font-semibold text-amber-600">★ (Admin)</span> : null}
            </div>
          )}
        </div>
      </div>

      {/* 게시글 */}
      <section className={"rounded border p-4 " + (isAdminPost ? "border-amber-300 bg-amber-50" : "")}>
        <div className="flex items-start justify-between gap-3">
          <h1 className={"text-2xl font-bold " + (isAdminPost ? "text-amber-900" : "")}>{post.title}</h1>

          <Link className="text-sm underline text-red-600" href={`/community/free/${encodeURIComponent(post.id)}/delete`}>
            삭제
          </Link>
        </div>

        <div className="mt-2 text-sm text-gray-500 flex flex-wrap gap-x-2 gap-y-1">
          <span>
            작성자: <span className="font-medium text-gray-700">{postAuthorName}</span>
            {isAdminPost && <span className="ml-2 font-semibold text-amber-700">★ (Admin)</span>}
          </span>
          <span>· {new Date(post.created_at).toLocaleString()}</span>
          <span>· 조회 {post.view_count}</span>
        </div>

        <article className="mt-4 whitespace-pre-wrap rounded border bg-white p-4">{post.content}</article>
      </section>

      {/* ✅ 댓글 섹션 */}
      <section className="rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">댓글</h2>
          <div className="text-sm text-gray-500">{comments.length}개</div>
        </div>

        {/* 작성 */}
        <div className="mt-3">
          <textarea
            className="w-full rounded border p-3 text-sm"
            rows={3}
            placeholder={me.userId ? "댓글을 입력하세요" : "댓글 작성은 로그인 후 가능합니다"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!me.userId || saving}
          />
          <div className="mt-2 flex justify-end">
            <button
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
              onClick={submitComment}
              disabled={!me.userId || saving}
            >
              {saving ? "등록 중…" : "등록"}
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div className="mt-4">
          {commentsLoading ? (
            <div className="text-gray-600">댓글 불러오는 중…</div>
          ) : commentsErr ? (
            <div className="rounded border p-3 text-red-600">{commentsErr}</div>
          ) : comments.length === 0 ? (
            <div className="rounded border p-3 text-gray-600">아직 댓글이 없습니다.</div>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => {
                const username = c.author?.username ?? "unknown";
                const isAdmin = c.author?.role === "admin";
                const canDelete = !!me.userId && (me.role === "admin" || c.author_id === me.userId);

                return (
                  <li key={c.id} className="rounded border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-800">{username}</span>
                        {isAdmin && <span className="ml-2 font-semibold text-amber-700">★ (Admin)</span>}
                        <div className="mt-1 text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
                      </div>

                      {canDelete ? (
                        <button
                          className="text-xs font-semibold text-red-600 underline"
                          onClick={() => deleteComment(c.id)}
                        >
                          삭제
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{c.content}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
