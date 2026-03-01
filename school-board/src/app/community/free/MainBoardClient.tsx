"use client";

import TimetableWidget from "@/components/TimetableWidget";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFreeBoard } from "./layout";

function PostRow({ post, index }: { post: any; index: number }) {
  return (
    <Link
      href={`/community/free/${post.id}`}
      className="glass-hover group flex items-center gap-4 rounded-xl bg-white/[0.03] p-4 transition-all hover:bg-white/10"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-xs font-black text-sky-400">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-bold text-slate-200 group-hover:text-sky-400">
          {post.title}
        </h4>
        <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 font-medium">
          <span>👤 {post.author?.username || "익명"}</span>
          <span>👀 {post.view_count}회</span>
          <span>📅 {new Date(post.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}

export default function MainBoardClient() {
  const { orderedPosts, loading } = useFreeBoard();
  const latestPosts = useMemo(() => orderedPosts.slice(0, 8), [orderedPosts]);

  return (
    <div className="space-y-8">
      {/* Hero Highlight */}
      <section className="glass relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-[100px]" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative z-10 max-w-2xl">
          <span className="inline-block rounded-full bg-sky-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
            Official Community
          </span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tighter text-white">
            CHJHS <span className="text-sky-500">Square</span>
          </h2>
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-400 font-medium">
            청주고 학생들을 위한 가장 자유로운 공간.<br className="hidden sm:block" />
            익명으로 나누는 우리들의 진짜 이야기, 지금 시작해보세요.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/community/free/new" className="btn-primary py-3 px-8 text-sm">
              글쓰기
            </Link>
            <Link href="/community/free/all" className="btn-secondary py-3 px-8 text-sm">
              전체글 보기
            </Link>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {/* Latest Posts */}
        <section className="glass flex flex-col rounded-[2rem] p-8">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🗞️</span> 최신 소식
            </h3>
            <Link href="/community/free/all" className="text-xs font-bold text-sky-400 hover:text-sky-300 uppercase tracking-widest">
              View All →
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
              ))
            ) : latestPosts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-20 text-slate-600">
                <span className="text-4xl">📭</span>
                <p className="mt-4 text-sm font-medium">첫 번째 소식을 남겨주세요.</p>
              </div>
            ) : (
              latestPosts.map((p, i) => <PostRow key={p.id} post={p} index={i} />)
            )}
          </div>
        </section>

        {/* Timetable & Others */}
        <section className="space-y-8">
          <TimetableWidget />

          {/* Meal Card */}
          <div className="glass overflow-hidden rounded-[2rem] p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="text-2xl">🍱</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Today's Meal</h3>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-8 text-center">
              <div className="text-4xl mb-4">🍗</div>
              <p className="text-sm font-medium text-slate-500 italic">
                오늘의 급식 정보를 가져오고 있습니다...
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
