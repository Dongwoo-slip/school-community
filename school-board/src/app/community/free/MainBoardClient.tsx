"use client";

import TimetableWidget from "@/components/TimetableWidget";
import { useMemo } from "react";
import Link from "next/link";
import { useFreeBoard } from "./layout";
import { getTier } from "@/lib/tiers";
import { formatAdminStudentLabel, type AuthorIdentity } from "@/lib/authorDisplay";

type BoardPost = {
  id: string;
  title: string;
  created_at: string;
  view_count: number;
  author?: AuthorIdentity | null;
};

function PostRow({ post, index, showStudentLabel }: { post: BoardPost; index: number; showStudentLabel: boolean }) {
  const t = getTier(post.author?.points || 0, post.author?.role || undefined);
  const isAdmin = post.author?.role === "admin";
  return (
    <Link
      href={`/community/free/${post.id}`}
      className="post-row"
    >
      <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', minWidth: 22 }}>{String(index + 1).padStart(2, '0')}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="post-row-title">
          {isAdmin && <span style={{ fontSize: '0.68rem', fontWeight: 600, background: 'var(--brand-dim)', color: 'var(--brand-light)', borderRadius: 999, padding: '0.08rem 0.45rem', marginRight: '0.45rem' }}>공지</span>}
          {post.title}
        </div>
        <div className="post-row-meta">
          <span className={t.color}>{t.icon} {post.author?.username || "익명"}</span>
          {showStudentLabel && <span>{formatAdminStudentLabel(post.author)}</span>}
          <span>👀 {post.view_count}</span>
          <span>{new Date(post.created_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</span>
        </div>
      </div>
    </Link>
  );
}

export default function MainBoardClient() {
  const { orderedPosts, loading, me } = useFreeBoard();
  const latestPosts = useMemo(() => orderedPosts.slice(0, 10), [orderedPosts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div className="main-hero-banner" style={{
        background: '#ffffff',
        border: '1px solid var(--border-mild)',
        borderRadius: 6,
        padding: '1.25rem',
        boxShadow: '0 10px 24px rgba(24,32,31,0.05)',
      }}>
        <img className="main-hero-emblem" src="/logo.png" alt="" aria-hidden="true" />
        <div className="main-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--brand-light)', background: 'var(--brand-dim)', padding: '0.22rem 0.62rem', borderRadius: 999 }}>청주고등학교</span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            CJHS <span style={{ color: 'var(--brand-light)' }}>Square</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.65 }}>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>

        <TimetableWidget />

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: '#fbfcfb' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 650, color: 'var(--text-primary)' }}>최신글</span>
            <Link href="/community/free/all" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--brand-light)' }}>전체보기</Link>
          </div>
          <div>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 54, background: 'var(--bg-elevated)', margin: '0.55rem', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
              ))
            ) : latestPosts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                아직 게시글이 없습니다. 첫 글을 남겨보세요!
              </div>
            ) : (
              latestPosts.map((p, i) => <PostRow key={p.id} post={p} index={i} showStudentLabel={me.role === "admin"} />)
            )}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 650, color: 'var(--text-primary)' }}>오늘의 급식</span>
            <Link href="/community/free/meal" style={{ marginLeft: 'auto', fontSize: '0.76rem', fontWeight: 600, color: 'var(--brand-light)' }}>자세히</Link>
          </div>
          <div style={{ textAlign: 'center', padding: '1.35rem', color: 'var(--text-muted)', fontSize: '0.84rem', borderRadius: 6, background: 'var(--bg-elevated)' }}>
            급식 탭에서 확인하세요
          </div>
        </div>
      </div>
    </div>
  );
}
