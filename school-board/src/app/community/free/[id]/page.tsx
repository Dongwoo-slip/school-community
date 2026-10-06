"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import LinkedText from "@/components/LinkedText";
import PostActionsBar from "@/components/PostActionsBar";
import { useFreeBoard } from "../layout";
import { getTier } from "@/lib/tiers";
import { formatAdminStudentLabel, type AuthorIdentity } from "@/lib/authorDisplay";

type Poll = { question?: string; options?: { id: string; text: string }[] };

type PostDetail = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
  view_count: number | null;
  author_id?: string | null;
  author?: AuthorIdentity | null;
  image_urls?: string[] | null;
  poll?: Poll | null;
};

type Comment = {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  author_id?: string | null;
  author?: AuthorIdentity | null;
};

const REPLY_MARKER_RE = /^\s*\[\[square-reply-to:([0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12})\]\]\s*/i;

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return String(iso);
  }
}

function getCommentAuthorName(comment?: Comment | null) {
  return comment?.author?.username || "unknown";
}

function getReplyTargetPreview(comment?: Comment | null) {
  const text = String(comment?.content ?? "").replace(REPLY_MARKER_RE, "").replace(/\s+/g, " ").trim();
  if (!text) return "원댓글 내용 없음";
  return text.length > 70 ? `${text.slice(0, 70)}...` : text;
}

function normalizeComment(comment: Comment): Comment {
  const match = String(comment.content ?? "").match(REPLY_MARKER_RE);
  if (!match) return comment;

  return {
    ...comment,
    parent_id: comment.parent_id ?? match[1],
    content: String(comment.content ?? "").replace(REPLY_MARKER_RE, ""),
  };
}

function sortAdminFirst(items: Comment[]) {
  return [...items].sort((a, b) => {
    const aAdmin = a.author?.role === "admin";
    const bAdmin = b.author?.role === "admin";
    if (aAdmin !== bAdmin) return aAdmin ? -1 : 1;
    return 0;
  });
}

export default function FreePostDetailPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();

  const raw = params?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  const { me } = useFreeBoard();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const [pollCounts, setPollCounts] = useState<Record<string, number>>({});
  const [pollTotal, setPollTotal] = useState(0);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [pollLoading, setPollLoading] = useState(false);


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
    setCommentsLoading(true);
    setErrorMsg(null);
    setAuthRequired(false);
    setComments([]);

    try {
      const postReq = fetch(`/api/posts/${encodeURIComponent(postId)}`, { cache: "no-store" });
      const commentsReq = fetch(`/api/comments?post_id=${encodeURIComponent(postId)}`, { cache: "no-store" });

      const resPost = await postReq;
      const jsonPost = await resPost.json().catch(() => ({}));

      if (!resPost.ok) {
        setPost(null);
        setComments([]);
        setCommentsLoading(false);
        if (resPost.status === 401) {
          setAuthRequired(true);
          setErrorMsg("로그인이 필요한 게시글입니다. 로그인하면 내용을 볼 수 있어요.");
          return;
        }
        setErrorMsg(jsonPost?.error ?? "게시글을 불러오지 못했습니다.");
        return;
      }

      const p = (jsonPost?.data ?? null) as PostDetail | null;
      setPost(p);
      setLoading(false);

      if (p?.poll && Array.isArray(p.poll.options) && p.poll.options.length >= 2) {
        // Poll은 결과가 늦게 로드되어도 되므로 개별 처리 (또는 위 Promise.all에 추가 가능)
        loadPoll(postId);
      }

      const resComm = await commentsReq;
      const jsonComm = await resComm.json().catch(() => ({}));
      setComments(Array.isArray(jsonComm?.data) ? jsonComm.data.map(normalizeComment) : []);
    } finally {
      setLoading(false);
      setCommentsLoading(false);
    }
  }


  const canDelete = useMemo(() => {
    if (!me.userId || !post) return false;
    if (me.role === "admin") return true;
    if (post.author_id && String(post.author_id) === String(me.userId)) return true;
    return false;
  }, [me.userId, me.role, post]);

  const canArchive = useMemo(() => {
    return !!me.userId && me.role === "admin" && !!post;
  }, [me.userId, me.role, post]);

  const canEdit = useMemo(() => {
    if (!me.userId || !post) return false;
    if (me.role === "admin") return true;
    return String(post.author_id) === String(me.userId);
  }, [me.userId, me.role, post]);

  const commentById = useMemo(() => {
    return new Map(comments.map((comment) => [comment.id, comment]));
  }, [comments]);

  const topLevelComments = useMemo(() => {
    return sortAdminFirst(comments.filter((comment) => !comment.parent_id || !commentById.has(comment.parent_id)));
  }, [comments, commentById]);

  const repliesByParentId = useMemo(() => {
    const grouped = new Map<string, Comment[]>();

    comments.forEach((comment) => {
      if (!comment.parent_id) return;
      const parentReplies = grouped.get(comment.parent_id) ?? [];
      parentReplies.push(comment);
      grouped.set(comment.parent_id, parentReplies);
    });

    grouped.forEach((parentReplies, parentId) => {
      grouped.set(parentId, sortAdminFirst(parentReplies));
    });

    return grouped;
  }, [comments]);

  async function onArchivePost() {
    if (!id) return;
    if (!confirm("이 글만 보관함으로 숨길까요? 방문자에게는 삭제된 것처럼 보입니다.")) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        alert(json?.error ?? "보관 실패");
        return;
      }
      router.push("/community/free/admin/archive");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
      router.push("/community/free/all");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onAddComment(parentId?: string | null) {
    if (!id) return;

    if (!me.userId) {
      alert("로그인이 필요합니다. 상단의 로그인 버튼을 눌러주세요.");
      return;
    }

    const content = parentId ? replyText.trim() : commentText.trim();
    if (!content) return;

    setBusy(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, content, parent_id: parentId ?? undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "댓글 등록 실패");
        return;
      }
      if (parentId) {
        setReplyText("");
        setReplyingToId(null);
      } else {
        setCommentText("");
      }
      await loadPostAndComments(id);
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteComment(commentId: string) {
    if (!id) return;
    if (!confirm("댓글을 삭제할까요?")) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "댓글 삭제 실패");
        return;
      }
      await loadPostAndComments(id);
    } finally {
      setBusy(false);
    }
  }

  async function vote(optionId: string) {
    if (!id) return;

    if (!me.userId) {
      alert("로그인이 필요합니다. 상단의 로그인 버튼을 눌러주세요.");
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
    if (!id || typeof id !== "string" || id.length === 0) return;
    loadPostAndComments(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openReply(commentId: string) {
    if (!me.userId) {
      alert("로그인이 필요합니다. 상단의 로그인 버튼을 눌러주세요.");
      return;
    }

    setReplyingToId(commentId);
    setReplyText("");
  }

  function renderComment(comment: Comment, depth = 0): ReactNode {
    const targetComment = comment.parent_id ? commentById.get(comment.parent_id) : null;
    const replies = repliesByParentId.get(comment.id) ?? [];
    const isReply = depth > 0;
    const isAdminComment = comment.author?.role === "admin";

    return (
      <div key={comment.id} className={isReply ? "relative ml-4 pl-8 sm:ml-8 sm:pl-9" : ""}>
        {isReply && (
          <div aria-hidden="true" className="pointer-events-none absolute left-1 top-0 h-9 w-7 sm:left-2">
            <span className={`absolute left-0 top-[-0.55rem] h-8 w-5 rounded-bl-xl border-b-2 border-l-2 ${isAdminComment ? "border-sky-300" : "border-slate-300"}`} />
            <span className={`absolute left-5 top-[1.38rem] h-1.5 w-1.5 rounded-full ${isAdminComment ? "bg-sky-300" : "bg-slate-300"}`} />
          </div>
        )}
        <div
          className={
            "post-comment-card group rounded-lg border p-3.5 transition-all " +
            (isAdminComment
              ? "border-sky-200 bg-[#eef6ff] shadow-sm shadow-sky-100/70 hover:bg-[#e6f1fd]"
              : "glass border-transparent hover:bg-slate-50")
          }
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const t = getTier(comment.author?.points || 0, comment.author?.role || undefined);
                  return (
                    <div className="flex min-w-0 items-center gap-2">
                      <span title={t.name}>{t.icon}</span>
                      <span className={`truncate text-sm font-semibold ${t.color}`}>{getCommentAuthorName(comment)}</span>
                      {me.role === "admin" && (
                        <span className="text-[11px] font-medium text-slate-400">
                          {formatAdminStudentLabel(comment.author)}
                        </span>
                      )}
                    </div>
                  );
                })()}
                {isAdminComment && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest ring-1 ring-inset" style={{ background: "var(--brand-dim)", color: "var(--brand-light)", borderColor: "rgba(31, 126, 219, 0.16)" }}>
                    관리자
                  </span>
                )}
              </div>

              {targetComment && (
                <div className={`mt-1.5 rounded-md border px-2.5 py-1.5 text-[11px] leading-4 ${isAdminComment ? "border-sky-200 bg-white/75 text-slate-600" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                  <span className="font-bold text-sky-700">@{getCommentAuthorName(targetComment)}</span>
                  <span> 님에게 답글</span>
                  <span className="ml-1 text-slate-400">{`"${getReplyTargetPreview(targetComment)}"`}</span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[10px] text-slate-500">{fmt(comment.created_at)}</span>
              {!!me.userId && (me.role === "admin" || String(comment.author_id) === String(me.userId)) && (
                <button
                  type="button"
                  onClick={() => onDeleteComment(comment.id)}
                  disabled={busy}
                  className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                >
                  삭제
                </button>
              )}
            </div>
          </div>

          <div className="post-comment-body whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
            <LinkedText text={comment.content} />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => openReply(comment.id)}
              disabled={busy}
              className="rounded px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-sky-700 disabled:opacity-50"
            >
              답글
            </button>
          </div>
        </div>

        {replyingToId === comment.id && (
          <div className="relative ml-4 mt-3 pl-8 sm:ml-8 sm:pl-9">
            <div aria-hidden="true" className="pointer-events-none absolute left-1 top-0 h-9 w-7 sm:left-2">
              <span className="absolute left-0 top-[-0.55rem] h-8 w-5 rounded-bl-xl border-b-2 border-l-2 border-sky-200" />
              <span className="absolute left-5 top-[1.38rem] h-1.5 w-1.5 rounded-full bg-sky-200" />
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-3">
            <div className="mb-2 text-xs font-semibold text-sky-800">
              @{getCommentAuthorName(comment)} 님에게 답글 남기는 중
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="답글을 입력하세요..."
              disabled={!me.userId || busy}
              className="min-h-[68px] w-full resize-none rounded-md border border-slate-200 bg-white p-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplyingToId(null);
                  setReplyText("");
                }}
                disabled={busy}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => onAddComment(comment.id)}
                disabled={!me.userId || busy || replyText.trim().length === 0}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {busy ? "등록 중..." : "답글 달기"}
              </button>
            </div>
            </div>
          </div>
        )}

        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Navigation & Auth */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/community/free/all"
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <span className="text-lg">←</span> 목록으로 돌아가기
        </Link>
      </div>

      {/* Main Post Content */}
      <article className="post-detail-article glass overflow-hidden rounded-lg shadow-sm">
        {!id ? (
          <div className="p-12 text-center text-slate-500">게시글을 여는 중…</div>
        ) : loading ? (
          <div className="p-12 text-center text-slate-500">정보를 불러오는 중입니다...</div>
        ) : errorMsg ? (
          authRequired ? (
            <div className="p-12 text-center">
              <div className="mx-auto max-w-sm rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
                <div className="text-base font-bold text-slate-100">로그인이 필요합니다</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{errorMsg}</p>
                <Link
                  className="btn-primary mt-5 inline-flex py-2 px-4 text-sm"
                  href={`/login?next=/community/free/${encodeURIComponent(id ?? "")}`}
                >
                  로그인하기
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-rose-400 font-medium">{errorMsg}</div>
          )
        ) : !post ? (
          <div className="p-12 text-center text-slate-500">게시글이 존재하지 않습니다.</div>
        ) : (
          <>
            {/* Post Header */}
            <header className="post-detail-header border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
              <div className="post-detail-header-row flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="post-detail-title break-words text-lg font-semibold leading-tight text-slate-950 sm:text-xl">
                    {post.title ?? "(제목 없음)"}
                  </h1>

                  <div className="post-detail-meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const t = getTier(post.author?.points || 0, post.author?.role || undefined);
                        return (
                          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-3">
                            <span className="text-sm" title={t.name}>{t.icon}</span>
                            <span className={`font-bold ${t.color}`}>{post.author?.username || "unknown"}</span>
                            {me.role === "admin" && (
                              <span className="text-xs font-medium text-slate-500">
                                {formatAdminStudentLabel(post.author)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {post.author?.role === "admin" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 ring-1 ring-inset ring-emerald-400/20 shadow-sm shadow-emerald-400/20 animate-pulse-subtle">
                          Admin
                        </span>
                      )}
                    </div>
                    <span className="text-slate-300">|</span>
                    <span>{fmt(post.created_at)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">조회수 {post.view_count ?? 0}</span>
                  </div>
                </div>

                {(canEdit || canArchive || canDelete) && (
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {canEdit && (
                      <Link
                        href={`/community/free/${encodeURIComponent(post.id)}/edit`}
                        className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      >
                        수정
                      </Link>
                    )}
                    {canArchive && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={onArchivePost}
                        className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                      >
                        보관
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={onDeletePost}
                        className="inline-flex min-h-8 items-center rounded-md border border-rose-200 bg-white px-2.5 text-xs font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                )}
              </div>
            </header>

            {/* Post Body */}
            <div className="post-detail-content p-5 sm:p-6">
              <div className="post-detail-body whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">
                <LinkedText text={post.content} />
              </div>

              {/* Attachments */}
              {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div className="mt-5">
                  <PostActionsBar postId={id} />
                </div>
              )}
            </div>
          </>
        )}
      </article>

      {/* Comments Section */}
      {!authRequired && (
      <section className="mt-5 space-y-3">
        <div className="post-comments-title flex items-center px-1 text-[0.95rem] font-semibold text-slate-950">
          <h2>댓글 {comments.length}</h2>
        </div>

        {/* Comment Input */}
        <div className="post-comment-input glass overflow-hidden rounded-lg p-3.5">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={me.userId ? "존중하며 소통해 주세요..." : "로그인이 필요합니다."}
            disabled={!me.userId || busy}
            className="post-comment-textarea min-h-[80px] w-full resize-none border-none bg-transparent p-0 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-0"
          />

          <div className="mt-2.5 flex items-center justify-end border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => onAddComment()}
              disabled={!me.userId || busy || commentText.trim().length === 0}
              className="btn-primary"
            >
              {busy ? "등록 중..." : "댓글 달기"}
            </button>
          </div>
        </div>

        {/* Comment List */}
        <div className="space-y-2">
          {commentsLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              댓글을 불러오는 중입니다...
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              첫 번째 댓글의 주인공이 되어보세요!
            </div>
          ) : (
            topLevelComments.map((comment) => renderComment(comment))
          )}
        </div>
      </section>
      )}
    </main>
  );
}
