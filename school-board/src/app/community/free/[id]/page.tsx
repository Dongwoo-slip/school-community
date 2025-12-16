"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Me = { id: string; email?: string; username?: string };
type AnyPost = Record<string, any>;
type AnyComment = Record<string, any>;

function pickParamId(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default function FreePostDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();

  const postId = useMemo(() => {
    const raw = pickParamId(params?.id);
    if (!raw || raw === "undefined") return "";
    return String(raw);
  }, [params]);

  const [me, setMe] = useState<Me | null>(null);
  const [post, setPost] = useState<AnyPost | null>(null);
  const [comments, setComments] = useState<AnyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");

  const fmt = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("ko-KR");
    } catch {
      return iso;
    }
  };

  // ✅ /api/me 가 { user: null }을 내려줘도 로그인으로 착각하지 않게 처리
  async function fetchMe() {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) return setMe(null);
      const json = await res.json().catch(() => null);
      const user = json?.user ?? null;
      if (user && user.id) setMe(user);
      else setMe(null);
    } catch {
      setMe(null);
    }
  }

  async function fetchPostAndComments(validId: string) {
    setLoading(true);
    try {
      // posts API는 { data: [...] } 형태(원문 유지)
      const listRes = await fetch(`/api/posts?board=free`, { cache: "no-store" });
      const listJson = await listRes.json().catch(() => null);
      const posts: AnyPost[] = listJson?.data ?? [];
      const found = posts.find((p) => String(p?.id) === validId) ?? null;
      setPost(found);

      // comments API는 post_id 필요
      const cRes = await fetch(`/api/comments?post_id=${validId}`, { cache: "no-store" });
      const cJson = await cRes.json().catch(() => null);
      setComments(cJson?.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
    if (!postId) {
      setLoading(false);
      return;
    }
    fetchPostAndComments(postId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // ✅ 로그아웃: /logout로 이동하지 말고 API만 호출(405 방지)
  async function onLogout() {
    await fetch("/api/logout", { method: "POST" });
    setMe(null);
    router.refresh();
  }

  async function onDelete() {
    if (!postId) return;
    if (!confirm("삭제할까요?")) return;

    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/community/free");
      router.refresh();
      return;
    }
    const t = await res.text().catch(() => "");
    console.error("DELETE FAIL:", res.status, t);
    if (res.status === 401) {
      alert("로그인 후 삭제할 수 있습니다.");
      router.push("/login");
      return;
    }
    alert("삭제 실패");
  }

  async function onAddComment() {
    const text = commentText.trim();
    if (!text) return;

    // ✅ me로 막지 말고, 서버 응답이 401이면 로그인 유도 (세션 판별 흔들림 방지)
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, content: text }),
    });

    if (res.ok) {
      setCommentText("");
      await fetchPostAndComments(postId);
      return;
    }

    const t = await res.text().catch(() => "");
    console.error("ADD COMMENT FAIL:", res.status, t);

    if (res.status === 401) {
      alert("댓글 작성은 로그인 후 가능합니다.");
      router.push("/login");
      return;
    }
    alert("댓글 등록 실패");
  }

  if (!postId) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="rounded-lg border bg-white p-6 text-black">
          잘못된 접근입니다.
          <div className="mt-4">
            <Link href="/community/free" className="text-sm hover:underline">
              ← 목록으로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="rounded-lg border bg-white p-6 text-black">로딩중…</div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="rounded-lg border bg-white p-6 text-black">게시글을 찾을 수 없습니다.</div>
        <div className="mt-4">
          <Link href="/community/free" className="text-sm hover:underline">
            ← 목록
          </Link>
        </div>
      </main>
    );
  }

  const title = post.title ?? "(제목 없음)";
  const content = post.content ?? "";

  const isOwner = me?.id && post.author_id ? String(me.id) === String(post.author_id) : false;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* 상단 */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/community/free" className="text-sm hover:underline text-white">
          ← 목록
        </Link>

        <div className="flex items-center gap-2">
          {me ? (
            <>
              <span className="text-sm text-gray-200">{me.username ?? me.email ?? "로그인됨"}</span>
              <button
                onClick={onLogout}
                className="rounded-md border px-3 py-2 text-sm text-black bg-white hover:bg-gray-50"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border px-3 py-2 text-sm text-black bg-white hover:bg-gray-50"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded-md border px-3 py-2 text-sm text-black bg-white hover:bg-gray-50"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 게시글 */}
      <section className="rounded-lg border bg-white p-6 text-black">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-black">{title}</h1>
          {isOwner ? (
            <button onClick={onDelete} className="text-sm font-medium text-red-600 hover:underline">
              삭제
            </button>
          ) : null}
        </div>

        <div className="mt-2 text-sm text-gray-700">
          작성자: {post.author?.username ?? "unknown"} · {fmt(post.created_at)} · 조회{" "}
          {post.view_count ?? 0}
        </div>

        <div className="mt-6 w-full min-w-0 rounded-md border p-4 text-black whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {content}
        </div>
      </section>

      {/* 댓글 */}
      <section className="mt-8 rounded-lg border bg-white p-6 text-black">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">댓글</h2>
          <span className="text-sm text-gray-600">{comments.length}개</span>
        </div>

        <div className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="h-28 w-full resize-none rounded-md border p-3 outline-none"
            placeholder="댓글을 입력하세요"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onAddComment}
              disabled={!commentText.trim()}
              className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              등록
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {comments.length === 0 ? (
            <div className="rounded-md border p-3 text-sm text-gray-600">아직 댓글이 없습니다.</div>
          ) : (
            comments.map((c) => (
              <div key={String(c.id)} className="rounded-md border p-3">
                <div className="text-sm font-medium">{c.author?.username ?? "unknown"}</div>
                <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {c.content ?? ""}
                </div>
                <div className="mt-1 text-xs text-gray-500">{fmt(c.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
