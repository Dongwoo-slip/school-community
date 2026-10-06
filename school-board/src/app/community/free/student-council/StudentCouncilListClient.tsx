"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  formatStudentCouncilDate,
  getDeadlineLabel,
  type StudentCouncilCategory,
  type StudentCouncilPost,
} from "@/lib/studentCouncil";

type Filter = "all" | StudentCouncilCategory;

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "notice", label: "공지사항" },
  { value: "council", label: "대의원회" },
  { value: "activity", label: "활동 현황" },
];

function categoryClass(category: StudentCouncilCategory) {
  if (category === "council") return "border-violet-200 bg-violet-50 text-violet-700";
  if (category === "activity") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function statusClass(status: StudentCouncilPost["status"]) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "closed") return "bg-slate-100 text-slate-500";
  if (status === "in_progress") return "bg-blue-50 text-blue-700";
  if (status === "scheduled") return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-600";
}

function wasRecentlyUpdated(post: StudentCouncilPost) {
  return new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 10 * 60 * 1000;
}

function StudentCouncilCard({ post }: { post: StudentCouncilPost }) {
  const deadlineLabel = getDeadlineLabel(post.deadline);
  const isClosed = deadlineLabel === "마감" || post.status === "closed";

  return (
    <Link
      href={`/community/free/student-council/${post.id}`}
      prefetch={false}
      className={`block rounded-md border bg-white p-4 transition-colors hover:border-sky-300 hover:bg-sky-50/30 ${
        isClosed ? "border-slate-200 opacity-75" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${categoryClass(post.category)}`}>
          {CATEGORY_LABELS[post.category]}
        </span>
        {post.is_pinned && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">필독</span>
        )}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          {post.target_audience}
        </span>
        {deadlineLabel && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isClosed ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>
            {deadlineLabel}
          </span>
        )}
        {wasRecentlyUpdated(post) && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">변경됨</span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(post.status)}`}>
          {STATUS_LABELS[post.status]}
        </span>
      </div>

      <h2 className="mt-3 text-[15px] font-black leading-6 text-slate-950">{post.title}</h2>
      {post.summary && <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-slate-600">{post.summary}</p>}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-500">
        <span>작성 {formatStudentCouncilDate(post.published_at ?? post.created_at)}</span>
        {post.event_date && <span>행사 {formatStudentCouncilDate(post.event_date, true)}</span>}
        {post.deadline && <span>마감 {formatStudentCouncilDate(post.deadline, true)}</span>}
        {post.department && <span>담당 {post.department}</span>}
      </div>
    </Link>
  );
}

export default function StudentCouncilListClient({
  isAdmin,
  featureEnabled,
}: {
  isAdmin: boolean;
  featureEnabled: boolean;
}) {
  const [posts, setPosts] = useState<StudentCouncilPost[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/student-council?limit=100", {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "게시물을 불러오지 못했습니다.");
        if (active) {
          setPosts(Array.isArray(json?.data) ? json.data : []);
          setAvailable(json?.available !== false);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "게시물을 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const visiblePosts = useMemo(
    () => (filter === "all" ? posts : posts.filter((post) => post.category === filter)),
    [filter, posts],
  );

  return (
    <div className="space-y-4">
      {!featureEnabled && isAdmin && (
        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold">비공개 미리보기입니다. 일반 사용자에게는 메뉴와 페이지가 표시되지 않습니다.</span>
          <Link href="/community/free/admin/student-council" className="font-black underline underline-offset-2">
            공개 설정
          </Link>
        </div>
      )}

      {!available && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-800">
          학생회 소통 기능을 준비 중입니다. 데이터베이스 설정이 완료되면 게시물이 표시됩니다.
        </div>
      )}

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">Student Council</div>
            <h1 className="mt-1 text-[22px] font-black text-slate-950">학생회 소통</h1>
            <p className="mt-1 text-[13px] leading-6 text-slate-600">
              학생회의 공지와 대의원회 논의 내용, 진행 중인 활동을 한곳에서 확인하세요.
            </p>
          </div>
          {isAdmin && (
            <Link href="/community/free/admin/student-council" className="btn-secondary px-3 py-2 text-[12px]">
              게시물 관리
            </Link>
          )}
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-md border border-slate-200 bg-white p-1" aria-label="학생회 소통 분류">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`whitespace-nowrap rounded px-3 py-2 text-[12px] font-bold ${
              filter === item.value ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-md border border-slate-200 bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-5 text-[13px] font-bold text-rose-700">{error}</div>
      ) : !available ? null : visiblePosts.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-[13px] text-slate-500">
          이 분류에 게시된 소식이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {visiblePosts.map((post) => <StudentCouncilCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  );
}
