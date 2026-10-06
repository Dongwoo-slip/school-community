import "server-only";

import { adminClient, requireUser } from "@/lib/serverAuth";

export const STUDENT_COUNCIL_UNAVAILABLE_MESSAGE =
  "학생회 소통 기능의 데이터베이스 설정이 아직 완료되지 않았습니다.";

export const STUDENT_COUNCIL_POST_SELECT = [
  "id",
  "category",
  "title",
  "summary",
  "body",
  "target_audience",
  "action_required",
  "decision_reason",
  "department",
  "event_date",
  "deadline",
  "meeting_date",
  "discussion_topics",
  "opinions",
  "decision",
  "next_schedule",
  "progress_stage",
  "status",
  "is_pinned",
  "is_published",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
  "published_at",
].join(",");

export function isStudentCouncilSchemaMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const value = error as { code?: unknown; message?: unknown };
  const code = String(value.code ?? "");
  const message = String(value.message ?? "").toLowerCase();

  return (
    code === "PGRST205"
    || code === "42P01"
    || (
      message.includes("student_council_")
      && (
        message.includes("could not find the table")
        || message.includes("does not exist")
        || message.includes("schema cache")
      )
    )
  );
}

export async function getStudentCouncilSetting() {
  const { data, error } = await adminClient()
    .from("student_council_settings")
    .select("feature_enabled,updated_at")
    .eq("id", "global")
    .maybeSingle();

  return {
    featureEnabled: Boolean(data?.feature_enabled),
    updatedAt: data?.updated_at ?? null,
    error,
  };
}

export async function requireStudentCouncilAccess() {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const isAdmin = auth.profile?.role === "admin";
  const setting = await getStudentCouncilSetting();

  return {
    ...auth,
    isAdmin,
    featureEnabled: true,
    settingError: setting.error,
  };
}
