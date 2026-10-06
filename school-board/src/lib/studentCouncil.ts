export const STUDENT_COUNCIL_CATEGORIES = ["notice", "council", "activity"] as const;
export const STUDENT_COUNCIL_STATUSES = [
  "draft",
  "published",
  "in_progress",
  "scheduled",
  "completed",
  "closed",
] as const;

export type StudentCouncilCategory = (typeof STUDENT_COUNCIL_CATEGORIES)[number];
export type StudentCouncilStatus = (typeof STUDENT_COUNCIL_STATUSES)[number];

export type StudentCouncilPost = {
  id: string;
  category: StudentCouncilCategory;
  title: string;
  summary: string;
  body: string;
  target_audience: string;
  action_required: string | null;
  decision_reason: string | null;
  department: string | null;
  event_date: string | null;
  deadline: string | null;
  meeting_date: string | null;
  discussion_topics: string | null;
  opinions: string | null;
  decision: string | null;
  next_schedule: string | null;
  progress_stage: string | null;
  status: StudentCouncilStatus;
  is_pinned: boolean;
  is_published: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export const CATEGORY_LABELS: Record<StudentCouncilCategory, string> = {
  notice: "공지사항",
  council: "대의원회",
  activity: "활동 현황",
};

export const STATUS_LABELS: Record<StudentCouncilStatus, string> = {
  draft: "임시 저장",
  published: "게시",
  in_progress: "진행 중",
  scheduled: "예정",
  completed: "완료",
  closed: "마감",
};

export const ACTIVITY_STAGES = [
  "제안 접수",
  "검토 중",
  "회의 논의",
  "준비 중",
  "시행 예정",
  "완료",
] as const;

export function isStudentCouncilCategory(value: unknown): value is StudentCouncilCategory {
  return typeof value === "string" && (STUDENT_COUNCIL_CATEGORIES as readonly string[]).includes(value);
}

export function isStudentCouncilStatus(value: unknown): value is StudentCouncilStatus {
  return typeof value === "string" && (STUDENT_COUNCIL_STATUSES as readonly string[]).includes(value);
}

export function formatStudentCouncilDate(value: string | null, includeTime = false) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(includeTime
        ? {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        : {}),
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getDeadlineLabel(value: string | null) {
  if (!value) return "";
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return "";

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate());
  const diff = Math.ceil((target - today) / 86400000);

  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return "마감";
}
