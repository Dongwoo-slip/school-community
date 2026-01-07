import { supabaseAdmin } from "@/lib/supabase/admin";
import { kstDateString } from "@/lib/time";

// ✅ 너 프로젝트 테이블명(필요시 수정)
const TABLE_POSTS = "posts";
const TABLE_COMMENTS = "comments";
const TABLE_REPORTS = "reports";

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

// ✅ 전체 글/댓글: 테이블에서 직접 count
export async function getTotalPostsCount() {
  return countAll(TABLE_POSTS, "id");
}
export async function getTotalCommentsCount() {
  return countAll(TABLE_COMMENTS, "id");
}

// ✅ 총회원수: auth.users가 “진짜 회원수”
export async function getTotalMembersCount() {
  const perPage = 1000;
  let page = 1;
  let total = 0;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Auth listUsers failed: ${error.message}`);

    const users = (data as any)?.users ?? [];
    total += users.length;

    if (users.length < perPage) break;
    page += 1;
    if (page > 1000) break;
  }

  return total;
}

// ✅ 누적 방문수(총합): site_stats(key/value)에서 visitors 읽기
export async function getTotalVisitsCount() {
  const { data, error } = await supabaseAdmin
    .from("site_stats")
    .select("value")
    .eq("key", "visitors")
    .maybeSingle();

  if (error) throw new Error(`Read site_stats(visitors) failed: ${error.message}`);
  return Number((data as any)?.value ?? 0);
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

export function kstToday() {
  return kstDateString(new Date());
}
