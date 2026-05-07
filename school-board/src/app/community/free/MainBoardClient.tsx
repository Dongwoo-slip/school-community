"use client";

import TimetableWidget from "@/components/TimetableWidget";
import { useMemo } from "react";
import Link from "next/link";
import { useFreeBoard } from "./layout";
import { getTier } from "@/lib/tiers";

function PostRow({ post, index }: { post: any; index: number }) {
  const t = getTier(post.author?.points || 0, post.author?.role || undefined);
  const isAdmin = post.author?.role === "admin";
  return (
    <Link
      href={`/community/free/${post.id}`}
      className="post-row"
    >
      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', minWidth: 20 }}>{String(index + 1).padStart(2, '0')}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isAdmin && <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'rgba(52,211,153,0.12)', color: 'var(--accent-mint)', borderRadius: 4, padding: '0.05rem 0.4rem', marginRight: '0.4rem' }}>공지</span>}
          {post.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 3, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span className={t.color}>{t.icon} {post.author?.username || "익명"}</span>
          <span>👀 {post.view_count}</span>
          <span>{new Date(post.created_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</span>
        </div>
      </div>
    </Link>
  );
}

export default function MainBoardClient() {
  const { orderedPosts, loading } = useFreeBoard();
  const latestPosts = useMemo(() => orderedPosts.slice(0, 10), [orderedPosts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0.05) 100%)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brand-light)', background: 'var(--brand-dim)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>청주고등학교</span>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          CJHS <span style={{ color: 'var(--brand-light)' }}>Square</span>
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.6 }}>
          우리들의 이야기, 자유롭게 나눠요.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <Link href="/community/free/new" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
            글쓰기
          </Link>
          <Link href="/community/free/all" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
            전체글 보기
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>

        {/* Timetable */}
        <TimetableWidget />

        {/* Latest Posts */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>최신글</span>
            <Link href="/community/free/all" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-light)' }}>전체보기 →</Link>
          </div>
          <div>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 52, background: 'var(--bg-elevated)', margin: '0.5rem', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
              ))
            ) : latestPosts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                아직 게시글이 없습니다. 첫 글을 남겨보세요!
              </div>
            ) : (
              latestPosts.map((p, i) => <PostRow key={p.id} post={p} index={i} />)
            )}
          </div>
        </div>

        {/* Meal placeholder */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>오늘의 급식</span>
            <Link href="/community/free/meal" style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-light)' }}>자세히 →</Link>
          </div>
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', borderRadius: 8, background: 'var(--bg-elevated)' }}>
            급식 탭에서 확인하세요
          </div>
        </div>
      </div>
    </div>
  );
}
