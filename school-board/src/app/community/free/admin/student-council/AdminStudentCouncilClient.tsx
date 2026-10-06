"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY_STAGES,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STUDENT_COUNCIL_CATEGORIES,
  STUDENT_COUNCIL_STATUSES,
  formatStudentCouncilDate,
  type StudentCouncilPost,
} from "@/lib/studentCouncil";

type Acknowledgement = {
  id: string;
  userId: string;
  displayName: string;
  schoolLabel: string;
  acknowledgedAt: string;
};

type PostStats = {
  postId: string;
  viewCount: number;
  acknowledgementCount: number;
  eligibleUserCount: number;
  acknowledgementRate: number;
  acknowledgements: Acknowledgement[];
};

type FormState = {
  category: StudentCouncilPost["category"];
  title: string;
  summary: string;
  body: string;
  targetAudience: string;
  actionRequired: string;
  decisionReason: string;
  department: string;
  eventDate: string;
  deadline: string;
  meetingDate: string;
  discussionTopics: string;
  opinions: string;
  decision: string;
  nextSchedule: string;
  progressStage: string;
  status: StudentCouncilPost["status"];
  isPinned: boolean;
  isPublished: boolean;
};

const emptyForm: FormState = {
  category: "notice",
  title: "",
  summary: "",
  body: "",
  targetAudience: "전교생",
  actionRequired: "",
  decisionReason: "",
  department: "",
  eventDate: "",
  deadline: "",
  meetingDate: "",
  discussionTopics: "",
  opinions: "",
  decision: "",
  nextSchedule: "",
  progressStage: "제안 접수",
  status: "draft",
  isPinned: false,
  isPublished: false,
};

function toDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formFromPost(post: StudentCouncilPost): FormState {
  return {
    category: post.category,
    title: post.title,
    summary: post.summary ?? "",
    body: post.body ?? "",
    targetAudience: post.target_audience,
    actionRequired: post.action_required ?? "",
    decisionReason: post.decision_reason ?? "",
    department: post.department ?? "",
    eventDate: toDateTimeInput(post.event_date),
    deadline: toDateTimeInput(post.deadline),
    meetingDate: toDateTimeInput(post.meeting_date),
    discussionTopics: post.discussion_topics ?? "",
    opinions: post.opinions ?? "",
    decision: post.decision ?? "",
    nextSchedule: post.next_schedule ?? "",
    progressStage: post.progress_stage ?? "제안 접수",
    status: post.status,
    isPinned: post.is_pinned,
    isPublished: post.is_published,
  };
}

function postPayload(post: StudentCouncilPost, changes: Partial<FormState> = {}) {
  return {
    ...formFromPost(post),
    ...changes,
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-black text-slate-600">{children}</label>;
}

const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-sky-500";
const textareaClass = `${inputClass} min-h-24 resize-y leading-5`;

export default function AdminStudentCouncilClient() {
  const [posts, setPosts] = useState<StudentCouncilPost[]>([]);
  const [stats, setStats] = useState<PostStats[]>([]);
  const [settingsAvailable, setSettingsAvailable] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openStatsId, setOpenStatsId] = useState<string | null>(null);

  const statsMap = useMemo(
    () => new Map(stats.map((item) => [item.postId, item])),
    [stats],
  );

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const [postsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/student-council", { cache: "no-store", credentials: "include" }),
        fetch("/api/student-council/settings", { cache: "no-store", credentials: "include" }),
      ]);
      const [postsJson, settingsJson] = await Promise.all([
        postsRes.json().catch(() => ({})),
        settingsRes.json().catch(() => ({})),
      ]);
      if (!postsRes.ok) throw new Error(postsJson?.error ?? "관리 데이터를 불러오지 못했습니다.");
      setPosts(Array.isArray(postsJson?.data) ? postsJson.data : []);
      setStats(Array.isArray(postsJson?.stats) ? postsJson.stats : []);
      setSettingsAvailable(
        postsJson?.available !== false && settingsJson?.available !== false,
      );
    } catch (loadError) {
      setMessage(loadError instanceof Error ? loadError.message : "관리 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  function edit(post: StudentCouncilPost) {
    setEditingId(post.id);
    setForm(formFromPost(post));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (busy || !settingsAvailable) return;
    setBusy(true);
    setMessage(null);
    try {
      const endpoint = editingId
        ? `/api/admin/student-council/${encodeURIComponent(editingId)}`
        : "/api/admin/student-council";
      const res = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "저장하지 못했습니다.");
      setMessage(editingId ? "게시물을 수정했습니다." : "게시물을 작성했습니다.");
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePost(post: StudentCouncilPost, changes: Partial<FormState>) {
    if (busy || !settingsAvailable) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/student-council/${encodeURIComponent(post.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(postPayload(post, changes)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "변경하지 못했습니다.");
      await load();
    } catch (updateError) {
      setMessage(updateError instanceof Error ? updateError.message : "변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(post: StudentCouncilPost) {
    if (!settingsAvailable) return;
    if (!confirm(`"${post.title}" 게시물을 삭제할까요? 확인 기록과 조회 기록도 함께 삭제됩니다.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/student-council/${encodeURIComponent(post.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "삭제하지 못했습니다.");
      if (editingId === post.id) resetForm();
      await load();
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">Student Council Admin</div>
            <h1 className="mt-1 text-[21px] font-black text-slate-950">학생회 소통 관리</h1>
            <p className="mt-1 text-[12px] text-slate-500">기존 관리자 계정만 게시물과 확인 결과를 관리할 수 있습니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/community/free/student-council" className="btn-secondary px-3 py-2 text-[12px]">
              일반 화면 미리보기
            </Link>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] font-black text-emerald-700">
              전체 회원 공개: ON
            </span>
          </div>
        </div>
        {!settingsAvailable && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
            데이터베이스 테이블을 찾지 못했습니다. 제공된 Supabase migration SQL을 먼저 실행해 주세요.
          </div>
        )}
        {message && (
          <div className="mt-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-[12px] font-bold text-sky-800">{message}</div>
        )}
      </section>

      <section
        className={`rounded-md border border-slate-200 bg-white p-5 ${
          settingsAvailable ? "" : "pointer-events-none opacity-60"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-black text-slate-950">{editingId ? "게시물 수정" : "새 게시물 작성"}</h2>
            <p className="mt-1 text-[11px] text-slate-500">비게시 상태로 저장하면 관리자만 미리볼 수 있습니다.</p>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-[11px] font-black text-slate-500 hover:text-sky-700">
              새 글로 전환
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel>카테고리</FieldLabel>
            <select value={form.category} onChange={(event) => setField("category", event.target.value as FormState["category"])} className={inputClass}>
              {STUDENT_COUNCIL_CATEGORIES.map((category) => (
                <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>진행 상태</FieldLabel>
            <select value={form.status} onChange={(event) => setField("status", event.target.value as FormState["status"])} className={inputClass}>
              {STUDENT_COUNCIL_STATUSES.map((status) => (
                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>공지 대상</FieldLabel>
            <input
              value={form.targetAudience}
              onChange={(event) => setField("targetAudience", event.target.value)}
              list="student-council-audiences"
              className={inputClass}
              placeholder="전교생, 1학년, 특정 참가자 등"
            />
            <datalist id="student-council-audiences">
              <option value="전교생" />
              <option value="1학년" />
              <option value="2학년" />
              <option value="3학년" />
              <option value="대의원회" />
              <option value="특정 참가자" />
            </datalist>
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel>제목</FieldLabel>
          <input value={form.title} onChange={(event) => setField("title", event.target.value)} className={inputClass} maxLength={160} />
        </div>
        <div className="mt-4">
          <FieldLabel>핵심 내용</FieldLabel>
          <textarea value={form.summary} onChange={(event) => setField("summary", event.target.value)} className={textareaClass} maxLength={500} />
        </div>
        <div className="mt-4">
          <FieldLabel>본문</FieldLabel>
          <textarea value={form.body} onChange={(event) => setField("body", event.target.value)} className={`${textareaClass} min-h-48`} maxLength={20000} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>학생이 해야 할 일</FieldLabel>
            <textarea value={form.actionRequired} onChange={(event) => setField("actionRequired", event.target.value)} className={textareaClass} />
          </div>
          <div>
            <FieldLabel>결정 이유 또는 배경</FieldLabel>
            <textarea value={form.decisionReason} onChange={(event) => setField("decisionReason", event.target.value)} className={textareaClass} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <FieldLabel>담당 학생회 부서</FieldLabel>
            <input value={form.department} onChange={(event) => setField("department", event.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>행사일</FieldLabel>
            <input type="datetime-local" value={form.eventDate} onChange={(event) => setField("eventDate", event.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>마감일</FieldLabel>
            <input type="datetime-local" value={form.deadline} onChange={(event) => setField("deadline", event.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>회의 일시</FieldLabel>
            <input type="datetime-local" value={form.meetingDate} onChange={(event) => setField("meetingDate", event.target.value)} className={inputClass} />
          </div>
        </div>

        {form.category === "council" && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>주요 안건</FieldLabel>
              <textarea value={form.discussionTopics} onChange={(event) => setField("discussionTopics", event.target.value)} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>제시된 의견</FieldLabel>
              <textarea value={form.opinions} onChange={(event) => setField("opinions", event.target.value)} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>결정 사항</FieldLabel>
              <textarea value={form.decision} onChange={(event) => setField("decision", event.target.value)} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>후속 일정</FieldLabel>
              <textarea value={form.nextSchedule} onChange={(event) => setField("nextSchedule", event.target.value)} className={textareaClass} />
            </div>
          </div>
        )}

        {form.category === "activity" && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>현재 진행 단계</FieldLabel>
              <select value={form.progressStage} onChange={(event) => setField("progressStage", event.target.value)} className={inputClass}>
                {ACTIVITY_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>다음 일정</FieldLabel>
              <textarea value={form.nextSchedule} onChange={(event) => setField("nextSchedule", event.target.value)} className={textareaClass} />
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-5 rounded-md border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-[12px] font-bold text-slate-700">
            <input type="checkbox" checked={form.isPinned} onChange={(event) => setField("isPinned", event.target.checked)} />
            필독 지정
          </label>
          <label className="flex items-center gap-2 text-[12px] font-bold text-slate-700">
            <input type="checkbox" checked={form.isPublished} onChange={(event) => setField("isPublished", event.target.checked)} />
            게시 상태
          </label>
          <span className="text-[11px] text-slate-500">체크하지 않으면 임시 저장/비게시 상태입니다.</span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={resetForm} className="btn-secondary px-4 py-2 text-[12px]">초기화</button>
          <button type="button" onClick={save} disabled={busy} className="btn-primary px-5 py-2 text-[12px] disabled:opacity-50">
            {busy ? "저장 중..." : editingId ? "수정 저장" : form.isPublished ? "게시하기" : "임시 저장"}
          </button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-black text-slate-950">게시물 및 반응</h2>
            <p className="mt-1 text-[11px] text-slate-500">확인 수와 사용자 목록은 이 관리자 화면에만 표시됩니다.</p>
          </div>
          <button type="button" onClick={() => void load()} className="text-[11px] font-black text-sky-700">새로고침</button>
        </div>

        {loading ? (
          <div className="p-6 text-[12px] text-slate-500">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-slate-500">작성된 게시물이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((post) => {
              const postStats = statsMap.get(post.id);
              const statsOpen = openStatsId === post.id;
              return (
                <article key={post.id} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-sky-50 px-2 py-0.5 text-[9px] font-black text-sky-700">{CATEGORY_LABELS[post.category]}</span>
                        <span className={`rounded px-2 py-0.5 text-[9px] font-black ${post.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {post.is_published ? "게시" : "비게시"}
                        </span>
                        {post.is_pinned && <span className="rounded bg-rose-50 px-2 py-0.5 text-[9px] font-black text-rose-700">필독</span>}
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">{STATUS_LABELS[post.status]}</span>
                      </div>
                      <h3 className="mt-2 truncate text-[14px] font-black text-slate-950">{post.title}</h3>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {post.target_audience} · 수정 {formatStudentCouncilDate(post.updated_at, true)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-slate-600">
                        <span>조회 {postStats?.viewCount ?? 0}</span>
                        <span>확인 {postStats?.acknowledgementCount ?? 0}</span>
                        <span>대상 계정 {postStats?.eligibleUserCount ?? 0}</span>
                        <span>확인율 {postStats?.acknowledgementRate ?? 0}%</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Link href={`/community/free/student-council/${post.id}`} className="rounded border border-slate-200 px-2.5 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50">미리보기</Link>
                      <button type="button" onClick={() => edit(post)} className="rounded border border-sky-200 px-2.5 py-1.5 text-[10px] font-black text-sky-700 hover:bg-sky-50">수정</button>
                      <button
                        type="button"
                        onClick={() => void updatePost(post, { isPublished: !post.is_published, status: !post.is_published && post.status === "draft" ? "published" : post.status })}
                        className="rounded border border-emerald-200 px-2.5 py-1.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-50"
                      >
                        {post.is_published ? "비게시" : "게시"}
                      </button>
                      <button type="button" onClick={() => setOpenStatsId(statsOpen ? null : post.id)} className="rounded border border-violet-200 px-2.5 py-1.5 text-[10px] font-black text-violet-700 hover:bg-violet-50">확인자</button>
                      <button type="button" onClick={() => void remove(post)} className="rounded border border-rose-200 px-2.5 py-1.5 text-[10px] font-black text-rose-700 hover:bg-rose-50">삭제</button>
                    </div>
                  </div>

                  {statsOpen && (
                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-black text-slate-700">확인한 사용자</div>
                      {postStats?.acknowledgements?.length ? (
                        <div className="mt-2 divide-y divide-slate-200">
                          {postStats.acknowledgements.map((item) => (
                            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[11px]">
                              <span className="font-bold text-slate-800">
                                {item.displayName}{item.schoolLabel ? ` · ${item.schoolLabel}` : ""}
                              </span>
                              <span className="text-slate-500">{formatStudentCouncilDate(item.acknowledgedAt, true)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500">아직 확인한 사용자가 없습니다.</div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
