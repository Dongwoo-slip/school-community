import { supabaseAdmin } from "@/lib/supabase/admin";
import { kstDateString } from "@/lib/time";

// ✅ 신규 집계용 테이블명(필요시 수정)
const TABLE_POSTS = "posts";
const TABLE_COMMENTS = "comments";
const TABLE_REPORTS = "reports";

type AnyRow = Record<string, any>;

function pickNumber(row: AnyRow, keys: string[], fallback = 0) {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return fallback;
}

async function getSiteStatsRow(): Promise<AnyRow> {
  // ✅ id 없이 “첫 행 1개”만 가져오기
  const { data, error } = await supabaseAdmin
    .from("site_stats")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Read site_stats failed: ${error.message}`);
  return (data as AnyRow) ?? {};
}

// --- cron_state ---
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

// --- 총합 4개: ✅ site_stats 기준 ---
export async function getTotalPostsCount() {
  const s = await getSiteStatsRow();
  return pickNumber(s, ["total_posts", "posts_total", "totalPost", "post_total", "posts", "total_posts_count"]);
}

export async function getTotalCommentsCount() {
  const s = await getSiteStatsRow();
  return pickNumber(s, ["total_comments", "comments_total", "totalComment", "comment_total", "comments", "total_comments_count"]);
}

export async function getTotalMembersCount() {
  const s = await getSiteStatsRow();
  return pickNumber(s, ["total_members", "members_total", "total_users", "totalUsers", "users_total", "members", "users"]);
}

export async function getTotalVisitsCount() {
  const s = await getSiteStatsRow();
  return pickNumber(s, ["total_visits", "visits_total", "totalVisits", "visit_total", "visits", "total_pv", "pageviews"]);
}

// --- 신규(지난 실행 이후) : 실제 테이블에서 계산 ---
async function countSince(table: string, since: Date) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gt("created_at", since.toISOString());

  if (error) throw new Error(`Count since failed on ${table}: ${error.message}`);
  return count ?? 0;
}

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
