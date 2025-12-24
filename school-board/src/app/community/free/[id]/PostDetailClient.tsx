"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminDmButton from "@/components/AdminDmButton";
import { useFreeBoard } from "../layout";

type Post = {
  id: string;
  title: string;
  content?: string | null;
  created_at: string;
  view_count?: number | null;
  author_id?: string | null;
  author?: { username: string | null; role: string | null } | null;
  image_urls?: string[] | null;
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}

async function fetchPostBestEffort(postId: string): Promise<Post> {
  const candidates = [`/api/posts/${encodeURIComponent(postId)}`, `/api/posts?id=${encodeURIComponent(postId)}`];

  let lastErr = "게시글을 불러오지 못했습니다.";
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.data) return json.data as Post;
      lastErr = json?.error ?? `불러오기 실패 (${res.status})`;
    } catch (e: any) {
      lastErr = e?.message ?? lastErr;
    }
  }
  throw new Error(lastErr + "\n※ /api/posts 상세 조회 API 경로가 다른 경우 이 파일의 candidates를 너 프로젝트에 맞게 바꿔줘.");
}

export default function PostDetailClient({ postId }: { postId: string }) {
  const { me } = useFreeBoard();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const p = await fetchPostBestEffort(postId);
        if (!alive) return;
        setPost(p);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "불러오기 실패");
        setPost(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [postId]);

  const authorName = useMemo(() => post?.author?.username ?? "unknown", [post]);
  const created = useMemo(() => (post?.created_at ? fmtDateTime(post.created_at) : ""), [post]);

  // ✅ 관리자면 "postId로" DM 버튼 표시 (author uuid 직접 안씀)
  const canDm = me.role === "admin" && !!post?.id;

  if (loading) return <div className="text-slate-600 text-sm">불러오는 중…</div>;

  if (err) {
    return (
      <div className="border border-slate-300 bg-white p-4 text-[12px] text-rose-700 whitespace-pre-wrap">
        {err}
        <div className="mt-3">
          <Link href="/community/free" className="text-sky-700 underline underline-offset-2">
            ← 메인으로
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="border border-slate-300 bg-white p-4 text-[12px] text-slate-700">
        게시글이 없습니다.
        <div className="mt-3">
          <Link href="/community/free" className="text-sky-700 underline underline-offset-2">
            ← 메인으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="border border-slate-300 bg-white">
      {/* 상단 */}
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[16px] font-extrabold text-slate-900 break-words">{post.title}</div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
              <span>
                작성자: <span className="font-semibold text-slate-900">{authorName}</span>
                {post.author?.role === "admin" ? <span className="ml-1 font-semibold text-amber-700">★</span> : null}
              </span>
              <span className="text-slate-300">|</span>
              <span>작성일: {created}</span>
              <span className="text-slate-300">|</span>
              <span>조회: {post.view_count ?? 0}</span>

              {/* ✅ 관리자만: postId로 DM 이동 */}
              {canDm ? (
                <span className="ml-2">
                  <AdminDmButton recipientUsername={post.author?.username ?? ""} recipientName={authorName} />

                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/community/free"
              className="border border-slate-300 bg-white px-3 py-1 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              목록
            </Link>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-4 py-4">
        <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-900">{post.content ?? ""}</div>

        {/* 이미지 */}
        {Array.isArray(post.image_urls) && post.image_urls.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {post.image_urls.map((url, idx) => (
              <div key={`${url}-${idx}`} className="border border-slate-200 bg-slate-50 p-2">
                <img src={url} alt={`img-${idx}`} className="h-auto w-full object-contain" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
        ※ 댓글/좋아요/신고 영역은 기존 상세페이지 코드가 있으면 이 아래에 그대로 붙이면 됩니다.
      </div>
    </article>
  );
}
