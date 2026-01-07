import { supabaseAdmin } from "@/lib/supabase/admin";
import { kstDateString } from "@/lib/time";

// ✅ 너 프로젝트 테이블명에 맞게 필요시 수정
const TABLE_POSTS = "posts";
const TABLE_COMMENTS = "comments";
const TABLE_MEMBERS = "profiles";      // 보통 profiles (없으면 너 테이블명으로 변경)
const TABLE_DAILY_VISITS = "daily_visits";
const TABLE_REPORTS = "reports";

export async function getLastRun(name: string) {
  const { data, error } = await supabaseAdmin
    .from("cron_state")
    .select("last_run_at")
    .eq("name", name)
    .maybeSingle();

  if (error) throw new Error(`DB read cron_state failed: ${error.message}`);
  return data?.last_run_at ? new Date(data.last_run_at) : new Date(0);
}

export async function setLastRun(name: string, when: Date) {
  const { error } = await supabaseAdmin
    .from("cron_state")
    .upsert({ name, last_run_at: when.toISOString() });

  if (error) throw new Error(`DB upsert cron_state failed: ${error.message}`);
}

async function countAll(table: string, column = "id") {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select(column, { count: "exact", head: true });

  if (error) throw new Error(`Count all failed on ${table}: ${error.message}`);
  return count ?? 0;
}

async function countSince(table: string, since: Date) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gt("created_at", since.toISOString());

  if (error) throw new Error(`Count since failed on ${table}: ${error.message}`);
  return count ?? 0;
}

// ✅ 총합 (요청한 4개)
export async function getTotalPostsCount() {
  return countAll(TABLE_POSTS, "id");
}

export async function getTotalCommentsCount() {
  return countAll(TABLE_COMMENTS, "id");
}

export async function getTotalMembersCount() {
  // profiles 테이블이 보통 id=uuid
  return countAll(TABLE_MEMBERS, "id");
}

export async function getTotalVisitsCount() {
  // daily_visits에 쌓인 전체 row 수(= 누적 방문수로 사용)
  // (같은 사람이 다른 날 방문하면 그 날마다 1회로 카운트)
  return countAll(TABLE_DAILY_VISITS, "visitor_id");
}

// ✅ 신규(지난 실행 이후)
export async function getNewPostsCount(since: Date) {
  return countSince(TABLE_POSTS, since);
}

export async function getNewCommentsCount(since: Date) {
  return countSince(TABLE_COMMENTS, since);
}

export async function getReportsSummary(since: Date) {
  const { count: newReports, error: e1 } = await supabaseAdmin
    .from(TABLE_REPORTS)
    .select("id", { count: "exact", head: true })
    .gt("created_at", since.toISOString());

  if (e1) throw new Error(`Count new reports failed: ${e1.message}`);

  const { count: openReports, error: e2 } = await supabaseAdmin
    .from(TABLE_REPORTS)
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  if (e2) throw new Error(`Count open reports failed: ${e2.message}`);

  return { newReports: newReports ?? 0, openReports: openReports ?? 0 };
}

// (선택) 메시지에 날짜 표시용
export function kstToday() {
  return kstDateString(new Date());
}
