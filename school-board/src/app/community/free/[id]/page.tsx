"use client";

<<<<<<< HEAD
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
=======
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

  // ✅✅✅ 로그인 판별 확실하게: user 없으면 무조건 null
  async function fetchMe() {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) return setMe(null);

      const json = await res.json();
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
      // 글 목록에서 찾기 (/api/posts는 { data: [...] } 형태)
      const listRes = await fetch(`/api/posts?board=free`, { cache: "no-store" });
      const listJson = await listRes.json().catch(() => null);
      const posts: AnyPost[] = listJson?.data ?? [];

      const found = posts.find((p) => String(p?.id) === validId) ?? null;
      setPost(found);

      // 댓글
      const cRes = await fetch(`/api/comments?post_id=${validId}`, { cache: "no-store" });
      const cJson = await cRes.json().catch(() => null);
      setComments(cJson?.data ?? cJson?.comments ?? []);
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

  // ✅✅✅ 로그아웃: Link 사용 금지(프리패치로 로그아웃될 수 있음)
  async function onLogout() {
    await fetch("/api/logout", { method: "POST" });
    setMe(null);
    router.refresh();
  }

  async function onAddComment() {
  const text = commentText.trim();
  if (!text) return;

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
>>>>>>> b3138e5 (deploy)
      </main>
    );
  }

  if (!post) {
    return (
<<<<<<< HEAD
      <main className="mx-auto max-w-3xl p-6">
        <Link className="text-sm underline" href="/community/free">
          ← 목록
        </Link>
        <div className="mt-6 rounded border p-4 text-gray-600">게시글이 없습니다.</div>
=======
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="rounded-lg border bg-white p-6 text-black">게시글을 찾을 수 없습니다.</div>
        <div className="mt-4">
          <Link href="/community/free" className="text-sm hover:underline">
            ← 목록
          </Link>
        </div>
>>>>>>> b3138e5 (deploy)
      </main>
    );
  }

<<<<<<< HEAD
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
=======
  const title = post.title ?? "(제목 없음)";
  const content = post.content ?? "";

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* 상단 버튼(로그인 상태 구분 확실하게) */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/community/free" className="text-sm hover:underline">
          ← 목록
        </Link>

        <div className="flex items-center gap-2">
          {me ? (
            <>
              <span className="text-sm text-gray-200">
                {me.username ?? me.email ?? "로그인됨"}
              </span>
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
>>>>>>> b3138e5 (deploy)
          )}
        </div>
      </div>

<<<<<<< HEAD
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
=======
      {/* 게시글 카드(흰 배경이면 글자 검정 고정) */}
      <section className="rounded-lg border bg-white p-6 text-black">
        <h1 className="text-2xl font-bold text-black">{title}</h1>

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
            placeholder={me ? "댓글을 입력하세요" : "댓글 작성은 로그인 후 가능합니다"}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onAddComment}
              disabled={!commentText.trim()}
              className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              등록
>>>>>>> b3138e5 (deploy)
            </button>
          </div>
        </div>

<<<<<<< HEAD
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
=======
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
>>>>>>> b3138e5 (deploy)
          )}
        </div>
      </section>
    </main>
  );
}
