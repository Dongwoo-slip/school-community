"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CATEGORY_LABELS,
  formatStudentCouncilDate,
  type StudentCouncilPost,
} from "@/lib/studentCouncil";

export default function StudentCouncilHomeCard({
  visible,
  privatePreview,
}: {
  visible: boolean;
  privatePreview: boolean;
}) {
  const [posts, setPosts] = useState<StudentCouncilPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    async function load() {
      const res = await fetch("/api/student-council?limit=3", {
        cache: "no-store",
        credentials: "include",
      }).catch(() => null);
      if (!res) return;
      const json = await res.json().catch(() => ({}));
      if (!active) return;
      setAvailable(json?.available !== false);
      if (res.ok) setPosts(Array.isArray(json?.data) ? json.data : []);
      setLoaded(true);
    }
    void load();
    return () => {
      active = false;
    };
  }, [visible]);

  if (!visible || !available || (!loaded && posts.length === 0)) return null;

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 bg-sky-50/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-slate-900">학생회 소통</span>
          {privatePreview && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700">비공개 미리보기</span>}
        </div>
        <Link href="/community/free/student-council" className="text-[11px] font-black text-sky-700">
          전체보기
        </Link>
      </div>
      {posts.length ? (
        <div className="divide-y divide-slate-100">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/community/free/student-council/${post.id}`}
              prefetch={false}
              className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50/40"
            >
              <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-black text-sky-700">
                {CATEGORY_LABELS[post.category]}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-800">{post.title}</span>
              <span className="shrink-0 text-[10px] text-slate-400">
                {formatStudentCouncilDate(post.published_at ?? post.created_at)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <Link href="/community/free/student-council" className="block px-4 py-5 text-center text-[12px] text-slate-500">
          게시된 소식이 없습니다.
        </Link>
      )}
    </section>
  );
}
