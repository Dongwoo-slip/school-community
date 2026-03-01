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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Navigation & Auth */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/community/free"
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <span className="text-lg">←</span> 목록으로 돌아가기
        </Link>

        <div className="flex items-center gap-2">
          {!me.userId ? (
            <>
              <Link
                className="btn-secondary py-1.5 px-3 text-xs"
                href={`/login?next=/community/free/${encodeURIComponent(id ?? "")}`}
              >
                로그인
              </Link>
              <Link className="btn-primary py-1.5 px-3 text-xs" href="/signup">
                회원가입
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* Main Post Content */}
      <article className="glass overflow-hidden rounded-2xl shadow-xl">
        {!id ? (
          <div className="p-12 text-center text-slate-500">게시글을 여는 중…</div>
        ) : loading ? (
          <div className="p-12 text-center text-slate-500">정보를 불러오는 중입니다...</div>
        ) : errorMsg ? (
          <div className="p-12 text-center text-rose-400 font-medium">{errorMsg}</div>
        ) : !post ? (
          <div className="p-12 text-center text-slate-500">게시글이 존재하지 않습니다.</div>
        ) : (
          <>
            {/* Post Header */}
            <header className="border-b border-white/5 bg-white/5 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-black text-white sm:text-3xl break-words leading-tight">
                    {post.title ?? "(제목 없음)"}
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">
                        {post.author?.username?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <span className="font-semibold text-slate-200">{post.author?.username ?? "unknown"}</span>
                      {post.author?.role === "admin" && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">ADMIN</span>
                      )}
                    </div>
                    <span className="text-slate-600">|</span>
                    <span>{fmt(post.created_at)}</span>
                    <span className="text-slate-600">|</span>
                    <span className="flex items-center gap-1">조회수 {post.view_count ?? 0}</span>
                  </div>
                </div>

                {canDelete && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onDeletePost}
                    className="btn-premium border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 py-2 px-4 shadow-lg shadow-rose-500/10"
                  >
                    삭제
                  </button>
                )}
              </div>
            </header>

            {/* Post Body */}
            <div className="p-6 sm:p-8">
              <div className="text-lg leading-relaxed text-slate-300 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {post.content ?? ""}
              </div>

              {/* Attachments */}
              {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {post.image_urls.map((url, i) => (
                    <a
                      key={url + i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-xl border border-white/5 transition-all hover:border-sky-500/30"
                    >
                      <img
                        src={url}
                        alt={`첨부 이미지 ${i + 1}`}
                        className="h-auto w-full object-cover transition-transform group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}

              {/* Poll Widget */}
              {post.poll && Array.isArray(post.poll.options) && post.poll.options.length >= 2 && (
                <div className="mt-10 rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-inner">
                  <div className="mb-6 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="text-2xl">🗳️</span> {post.poll.question ?? "투표해 주세요"}
                    </h3>
                    <span className="text-xs font-medium text-slate-500">
                      {pollLoading ? "로딩 중..." : `총 ${pollTotal}명 참여`}
                    </span>
                  </div>

                  <div className="space-y-3">
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
                            "group w-full rounded-xl border p-4 text-left transition-all " +
                            (picked
                              ? "border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                              : "border-white/5 bg-white/5 hover:bg-white/10")
                          }
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-100">
                              {opt.text}
                              {picked && <span className="ml-2 text-[10px] font-black tracking-widest text-sky-400 uppercase">My Choice</span>}
                            </span>
                            <span className="text-sm font-bold text-slate-400">{pct}%</span>
                          </div>

                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full bg-sky-500 transition-all duration-1000 ease-out"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Post Actions Bar */}
              {id && (
                <div className="mt-10 border-t border-white/5 pt-8">
                  <PostActionsBar postId={id} />
                </div>
              )}
            </div>
          </>
        )}
      </article>

      {/* Comments Section */}
      <section className="mt-8 space-y-6">
        <div className="flex items-center gap-2 px-2 text-xl font-black text-white">
          <span>💬</span>
          <h2>댓글 {comments.length}</h2>
        </div>

        {/* Comment Input */}
        <div className="glass overflow-hidden rounded-2xl p-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={me.userId ? "존중하며 소통해 주세요..." : "로그인이 필요합니다."}
            disabled={!me.userId || busy}
            className="w-full min-h-[120px] resize-none border-none bg-transparent p-0 text-slate-200 placeholder:text-slate-600 focus:ring-0 text-base"
          />

          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
            <p className="text-xs text-slate-500">사이버 폭력 예방을 위해 따뜻한 댓글을 남겨주세요.</p>
            <button
              type="button"
              onClick={onAddComment}
              disabled={!me.userId || busy || commentText.trim().length === 0}
              className="btn-primary"
            >
              {busy ? "등록 중..." : "댓글 달기"}
            </button>
          </div>
        </div>

        {/* Comment List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-slate-600 text-sm italic">
              첫 번째 댓글의 주인공이 되어보세요!
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="glass group rounded-2xl p-6 transition-all hover:bg-white/10">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                      {c.author?.username?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-100">{c.author?.username ?? "unknown"}</span>
                      {c.author?.role === "admin" && (
                        <span className="ml-2 text-[10px] font-bold text-amber-500">ADMIN</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">{fmt(c.created_at)}</span>
                </div>

                <div className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
