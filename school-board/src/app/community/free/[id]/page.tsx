"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Comments from "./Comments";

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  view_count: number;
  author_id: string | null;
};

type Me = {
  userId: string | null;
  role: "guest" | "user" | "admin" | string;
  username: string | null;
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [post, setPost] = useState<Post | null>(null);
  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // 로그인/권한 정보
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setMe({
        userId: json.userId ?? null,
        role: json.role ?? "guest",
        username: json.username ?? null,
      });
    })();
  }, []);

  // 글 불러오기
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setErr("");

    (async () => {
      const res = await fetch(`/api/posts/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(json?.error ?? "불러오기 실패");
        setLoading(false);
        return;
      }

      setPost(json.data as Post);
      setLoading(false);
    })();
  }, [id]);

  const canDeletePost = useMemo(() => {
    if (!post) return false;
    if (!me.userId) return false;
    if (me.role === "admin") return true;
    return !!post.author_id && post.author_id === me.userId;
  }, [post, me]);

  async function onDeletePost() {
    if (!id) return;

    if (!me.userId) {
      alert("로그인이 필요합니다.");
      router.push(`/login?next=/community/free/${id}`);
      return;
    }

    if (!confirm("정말 삭제할까요?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "삭제 실패");
        return;
      }
      router.push("/community/free");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl p-6">불러오는 중…</main>;
  }

  if (err) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <a className="text-sm underline" href="/community/free">← 목록</a>
        <div className="mt-6 rounded border p-4 text-red-600">{err}</div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <a className="text-sm underline" href="/community/free">← 목록</a>
        <div className="mt-6 rounded border p-4 text-red-600">글을 찾을 수 없습니다.</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <a className="text-sm underline" href="/community/free">← 목록</a>
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
              <a className="rounded border px-3 py-2" href={`/login?next=/community/free/${post.id}`}>로그인</a>
              <a className="rounded border px-3 py-2" href="/signup">회원가입</a>
            </>
          ) : (
            <a className="rounded border px-3 py-2" href="/logout">로그아웃</a>
          )}

          {canDeletePost && (
            <button
              className="rounded border px-3 py-2 text-red-600 disabled:opacity-60"
              onClick={onDeletePost}
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold">{post.title}</h1>

      <div className="text-sm text-gray-500">
        {new Date(post.created_at).toLocaleString()} · 조회 {post.view_count}
      </div>

      <article className="whitespace-pre-wrap rounded border p-4">{post.content}</article>

      {/* ✅ 댓글 영역: post가 null이 아닐 때만 렌더됨 */}
      <Comments postId={post.id} meUserId={me.userId} meRole={me.role} />
    </main>
  );
}
