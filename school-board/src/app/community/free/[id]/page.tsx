"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PostActionsBar from "@/components/PostActionsBar";

type Me = { userId: string | null; role: string; username: string | null };

type Poll = { question?: string; options?: { id: string; text: string }[] };

type PostDetail = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
  view_count: number | null;
  author_id?: string | null;
  author?: { username: string | null; role: string | null } | null;
  image_urls?: string[] | null;
  poll?: Poll | null;
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
  const params = useParams();

  const raw = (params as any)?.id as string | string[] | undefined;
  const id = Array.isArray(raw) ? raw[0] : raw;

  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [pollCounts, setPollCounts] = useState<Record<string, number>>({});
  const [pollTotal, setPollTotal] = useState(0);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [pollLoading, setPollLoading] = useState(false);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setMe({ userId: json.userId ?? null, role: json.role ?? "guest", username: json.username ?? null });
  }

  async function loadPoll(postId: string) {
    setPollLoading(true);
    try {
      const res = await fetch(`/api/polls?post_id=${encodeURIComponent(postId)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setPollCounts(json.counts ?? {});
      setPollTotal(typeof json.total === "number" ? json.total : 0);
      setMyVote(json.myVote ?? null);
    } finally {
      setPollLoading(false);
    }
  }

  async function loadPostAndComments(postId: string) {
    setLoading(true);
    setErrorMsg(null);

    try {
      const resPost = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { cache: "no-store" });
      const jsonPost = await resPost.json().catch(() => ({}));

      if (!resPost.ok) {
        setPost(null);
        setComments([]);
        setErrorMsg(jsonPost?.error ?? "게시글을 불러오지 못했습니다.");
        return;
      }

      const p = (jsonPost?.data ?? null) as PostDetail | null;
      setPost(p);

      const resC = await fetch(`/api/comments?post_id=${encodeURIComponent(postId)}`, { cache: "no-store" });
      const jsonC = await resC.json().catch(() => ({}));
      setComments(jsonC?.data ?? []);

      if (p?.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2) {
        await loadPoll(postId);
      } else {
        setPollCounts({});
        setPollTotal(0);
        setMyVote(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await fetch("/logout", { method: "POST" }).catch(() => null);
    await loadMe();
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
      await loadPostAndComments(id);
    } finally {
      setBusy(false);
    }
  }

  async function vote(optionId: string) {
    if (!id) return;

    if (!me.userId) {
      alert("로그인이 필요합니다.");
      router.push(`/login?next=/community/free/${encodeURIComponent(id)}`);
      return;
    }

    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: id, option_id: optionId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json?.error ?? "투표 실패");
      return;
    }

    await loadPoll(id);
  }

  useEffect(() => {
    loadMe();
    if (!id || typeof id !== "string" || id.length === 0) return;
    loadPostAndComments(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
      {/* 상단 */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/community/free" className="text-sm text-slate-700 hover:underline">
          ← 목록
        </Link>

        <div className="flex items-center gap-2">
          {!me.userId ? (
            <>
              <Link
                className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50"
                href={`/login?next=/community/free/${encodeURIComponent(id ?? "")}`}
              >
                로그인
              </Link>
              <Link className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50" href="/signup">
                회원가입
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* 게시글 카드 */}
      <section className="border border-slate-300 bg-white p-4 sm:p-6">
        {!id ? (
          <div className="text-slate-600 text-sm">게시글을 여는 중…</div>
        ) : loading ? (
          <div className="text-slate-600 text-sm">불러오는 중…</div>
        ) : errorMsg ? (
          <div className="text-rose-600 text-sm">{errorMsg}</div>
        ) : !post ? (
          <div className="text-slate-700 text-sm">게시글이 없습니다.</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
                  {post.title ?? "(제목 없음)"}
                </h1>

                <div className="mt-2 text-xs sm:text-sm text-slate-600 flex flex-wrap gap-x-2 gap-y-1">
                  <span>
                    작성자:{" "}
                    <span className="font-semibold text-slate-900">{post.author?.username ?? "unknown"}</span>
                    {post.author?.role === "admin" ? <span className="ml-2 font-semibold text-amber-700">★ (Admin)</span> : null}
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
                  className="shrink-0 border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  삭제
                </button>
              ) : null}
            </div>

            {/* 본문 */}
            <div className="mt-4 border border-slate-200 bg-white p-4 text-slate-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {post.content ?? ""}
            </div>

            {/* (있으면) 투표 */}
            {post.poll && Array.isArray(post.poll.options) && post.poll.options.length >= 2 ? (
              <div className="mt-4 border border-slate-300 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-slate-900">🗳️ {post.poll.question ?? "투표"}</div>
                  <div className="text-xs text-slate-600">{pollLoading ? "불러오는 중…" : `총 ${pollTotal}표`}</div>
                </div>

                <div className="mt-3 space-y-2">
                  {post.poll.options.map((opt) => {
                    const c = pollCounts[opt.id] ?? 0;
                    const pct = pollTotal > 0 ? Math.round((c / pollTotal) * 100) : 0;
                    const picked = myVote === opt.id;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => vote(opt.id)}
                        disabled={pollLoading}
                        className={
                          "w-full border px-3 py-2 text-left disabled:opacity-60 " +
                          (picked ? "border-sky-600 bg-sky-50" : "border-slate-300 bg-white hover:bg-slate-50")
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-slate-900">
                            {opt.text}
                            {picked ? <span className="ml-2 text-xs text-sky-700 font-bold">(내 선택)</span> : null}
                          </div>
                          <div className="text-xs text-slate-700 whitespace-nowrap">
                            {c}표 · {pct}%
                          </div>
                        </div>

                        <div className="mt-2 h-2 w-full border border-slate-200 bg-white">
                          <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 첨부 이미지 */}
            {Array.isArray(post.image_urls) && post.image_urls.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {post.image_urls.map((url, i) => (
                  <a key={url + i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden border border-slate-200 bg-white">
                    <img src={url} alt={`첨부 이미지 ${i + 1}`} className="h-auto w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            ) : null}

            {/* ✅ 여기! 게시글 아래 액션바 */}
            {id ? (
              <div className="mt-4">
                <PostActionsBar postId={id} />
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* 댓글 */}
      <section className="mt-4 border border-slate-300 bg-white p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">댓글</h2>
          <div className="text-sm text-slate-600">{comments.length}개</div>
        </div>

        {/* 입력 */}
        <div className="border border-slate-200 bg-white p-3 sm:p-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={me.userId ? "댓글을 입력하세요" : "댓글 작성은 로그인 후 가능합니다"}
            disabled={!me.userId || busy}
            className="w-full resize-none border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            rows={4}
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onAddComment}
              disabled={!me.userId || busy || commentText.trim().length === 0}
              className="border border-emerald-300 bg-emerald-300 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-200 disabled:opacity-50"
            >
              등록
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div className="mt-4 space-y-3">
          {comments.length === 0 ? (
            <div className="border border-slate-200 bg-white p-4 text-sm text-slate-600">아직 댓글이 없습니다.</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="border border-slate-200 bg-white p-4">
                <div className="text-xs sm:text-sm text-slate-600 flex flex-wrap gap-x-2 gap-y-1">
                  <span>
                    작성자: <span className="font-semibold text-slate-900">{c.author?.username ?? "unknown"}</span>
                    {c.author?.role === "admin" ? <span className="ml-2 font-semibold text-amber-700">★ (Admin)</span> : null}
                  </span>
                  <span>· {fmt(c.created_at)}</span>
                </div>

                <div className="mt-2 text-sm text-slate-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
