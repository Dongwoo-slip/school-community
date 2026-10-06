"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ACTIVITY_STAGES,
  CATEGORY_LABELS,
  STATUS_LABELS,
  formatStudentCouncilDate,
  type StudentCouncilPost,
} from "@/lib/studentCouncil";

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-[12px] font-black text-sky-800">{title}</h2>
      <div className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-700">{children}</div>
    </section>
  );
}

function ActivityProgress({ stage }: { stage: string | null }) {
  if (!stage) return null;
  const activeIndex = ACTIVITY_STAGES.indexOf(stage as (typeof ACTIVITY_STAGES)[number]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-[12px] font-black text-sky-800">진행 단계</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ACTIVITY_STAGES.map((item, index) => {
          const reached = activeIndex >= 0 && index <= activeIndex;
          const current = item === stage;
          return (
            <div
              key={item}
              className={`rounded border px-2 py-2 text-center text-[11px] font-bold ${
                current
                  ? "border-sky-700 bg-sky-700 text-white"
                  : reached
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              {item}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function StudentCouncilDetailClient({
  postId,
  isAdmin,
  featureEnabled,
}: {
  postId: string;
  isAdmin: boolean;
  featureEnabled: boolean;
}) {
  const [post, setPost] = useState<StudentCouncilPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null);
  const [ackBusy, setAckBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const previewQuery = isAdmin ? "?preview=1" : "";
        const res = await fetch(`/api/student-council/${encodeURIComponent(postId)}${previewQuery}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "게시물을 불러오지 못했습니다.");
        if (!active) return;
        setPost(json.data ?? null);
        setAcknowledged(Boolean(json.acknowledged));
        setAcknowledgedAt(json.acknowledgedAt ?? null);
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
  }, [isAdmin, postId]);

  async function acknowledge() {
    if (acknowledged || ackBusy) return;
    setAckBusy(true);
    try {
      const res = await fetch(`/api/student-council/${encodeURIComponent(postId)}/acknowledge`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "확인 기록을 저장하지 못했습니다.");
      setAcknowledged(true);
      setAcknowledgedAt(json.acknowledgedAt ?? new Date().toISOString());
    } catch (ackError) {
      alert(ackError instanceof Error ? ackError.message : "확인 기록을 저장하지 못했습니다.");
    } finally {
      setAckBusy(false);
    }
  }

  if (loading) return <div className="h-80 animate-pulse rounded-md border border-slate-200 bg-white" />;
  if (error || !post) {
    return <div className="rounded-md border border-rose-200 bg-rose-50 p-5 text-[13px] font-bold text-rose-700">{error ?? "게시물이 없습니다."}</div>;
  }

  return (
    <div className="space-y-4">
      {!featureEnabled && isAdmin && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-800">
          비공개 미리보기입니다. 일반 사용자는 이 게시물에 접근할 수 없습니다.
        </div>
      )}

      <article className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700">
            {CATEGORY_LABELS[post.category]}
          </span>
          {post.is_pinned && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700">필독</span>}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{post.target_audience}</span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{STATUS_LABELS[post.status]}</span>
          {!post.is_published && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">비게시</span>}
        </div>

        <h1 className="mt-4 text-[22px] font-black leading-8 text-slate-950">{post.title}</h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
          <span>게시 {formatStudentCouncilDate(post.published_at ?? post.created_at, true)}</span>
          <span>수정 {formatStudentCouncilDate(post.updated_at, true)}</span>
          {post.department && <span>담당 {post.department}</span>}
        </div>

        {post.summary && (
          <div className="mt-5 rounded-md border border-sky-100 bg-sky-50 p-4">
            <div className="text-[11px] font-black text-sky-800">핵심 내용</div>
            <p className="mt-1 whitespace-pre-wrap text-[14px] font-semibold leading-6 text-slate-800">{post.summary}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {post.event_date && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-black text-slate-500">행사 일정</div>
              <div className="mt-1 text-[13px] font-bold text-slate-800">{formatStudentCouncilDate(post.event_date, true)}</div>
            </div>
          )}
          {post.deadline && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-black text-slate-500">기한</div>
              <div className="mt-1 text-[13px] font-bold text-slate-800">{formatStudentCouncilDate(post.deadline, true)}</div>
            </div>
          )}
          {post.meeting_date && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-black text-slate-500">회의 일시</div>
              <div className="mt-1 text-[13px] font-bold text-slate-800">{formatStudentCouncilDate(post.meeting_date, true)}</div>
            </div>
          )}
          {post.department && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-black text-slate-500">담당 학생회 부서</div>
              <div className="mt-1 text-[13px] font-bold text-slate-800">{post.department}</div>
            </div>
          )}
        </div>
      </article>

      {post.action_required && <DetailSection title="학생이 해야 할 일">{post.action_required}</DetailSection>}
      {post.category === "council" && post.discussion_topics && <DetailSection title="무엇을 논의했는가">{post.discussion_topics}</DetailSection>}
      {post.category === "council" && post.opinions && <DetailSection title="어떤 의견이 제시되었는가">{post.opinions}</DetailSection>}
      {post.category === "council" && post.decision && <DetailSection title="무엇이 결정되었는가">{post.decision}</DetailSection>}
      {post.body && <DetailSection title="본문">{post.body}</DetailSection>}
      {post.decision_reason && <DetailSection title="결정 이유 또는 배경">{post.decision_reason}</DetailSection>}
      {post.next_schedule && <DetailSection title="다음 일정">{post.next_schedule}</DetailSection>}
      {post.category === "activity" && <ActivityProgress stage={post.progress_stage} />}

      {post.is_published && (
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <button
            type="button"
            onClick={acknowledge}
            disabled={acknowledged || ackBusy}
            className={`w-full rounded-md px-4 py-3 text-[13px] font-black ${
              acknowledged
                ? "cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "bg-sky-700 text-white hover:bg-sky-600 disabled:opacity-60"
            }`}
          >
            {acknowledged ? "공지 내용을 확인했습니다" : ackBusy ? "저장 중..." : "공지 내용을 확인했습니다"}
          </button>
          {acknowledgedAt && (
            <p className="mt-2 text-center text-[10px] text-slate-500">
              확인 시각 {formatStudentCouncilDate(acknowledgedAt, true)}
            </p>
          )}
        </section>
      )}

      <div className="flex items-center justify-between">
        <Link href="/community/free/student-council" className="text-[12px] font-bold text-slate-600 hover:text-sky-700">
          ← 목록으로
        </Link>
        {isAdmin && (
          <Link href="/community/free/admin/student-council" className="text-[12px] font-black text-sky-700">
            관리자 화면
          </Link>
        )}
      </div>
    </div>
  );
}
