import { supabaseAdmin } from "@/lib/supabase/admin";
import { kstDateString } from "@/lib/time";

// ✅ 너 프로젝트 테이블명 (필요시 수정)
const TABLE_POSTS = "posts";
const TABLE_COMMENTS = "comments";
const TABLE_REPORTS = "reports";

// ✅ site_stats에서 총합을 읽어올 때 사용할 id (보통 1)
const SITE_STATS_ID = 1;

type SiteStatsRow = {
  id: number;
  total_posts: number | null;
  total_comments: number | null;
  total_members: number | null;
  total_visits: number | null;
  updated_at?: string | null;
};

async function getSiteStats(): Promise<SiteStatsRow> {
  const { data, error } = await supabaseAdmin
    .from("site_stats")
    .select("id,total_posts,total_comments,total_members,total_visits,updated_at")
    .eq("id", SITE_STATS_ID)
    .maybeSingle();

  if (error) throw new Error(`Read site_stats failed: ${error.message}`);
  if (!data) {
    // row가 없으면 0으로 처리(원하면 여기서 에러로 바꿔도 됨)
    return {
      id: SITE_STATS_ID,
      total_posts: 0,
      total_comments: 0,
      total_members: 0,
      total_visits: 0,
      updated_at: null,
    };
  }

  return data as SiteStatsRow;
}

// --- cron_state (요약 기준 시점 저장) ---
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

// --- 총합(요청한 4개) : ✅ site_stats 기준 ---
export async function getTotalPostsCount() {
  const s = await getSiteStats();
  return Number(s.total_posts ?? 0);
}

export async function getTotalCommentsCount() {
  const s = await getSiteStats();
  return Number(s.total_comments ?? 0);
}

export async function getTotalMembersCount() {
  const s = await getSiteStats();
  return Number(s.total_members ?? 0);
}

export async function getTotalVisitsCount() {
  // ✅ “누적 방문수(총합)” : site_stats.total_visits 사용
  const s = await getSiteStats();
  return Number(s.total_visits ?? 0);
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
