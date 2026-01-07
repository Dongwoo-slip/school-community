import { supabaseAdmin } from "@/lib/supabase/admin";
import { kstDateString } from "@/lib/time";

// 신규 집계용(필요하면 너 테이블명으로 수정)
const TABLE_POSTS = "posts";
const TABLE_COMMENTS = "comments";
const TABLE_REPORTS = "reports";

type AnyRow = Record<string, any>;

function toNumber(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim().replaceAll(",", "");
    if (t && !Number.isNaN(Number(t))) return Number(t);
  }
  return null;
}

function bestByKeywords(row: AnyRow, include: RegExp[], exclude: RegExp[] = []): number {
  const entries = Object.entries(row)
    .map(([k, v]) => [k, toNumber(v)] as const)
    .filter(([, n]) => n !== null) as Array<[string, number]>;

  const cands = entries
    .filter(([k]) => include.some((r) => r.test(k)) && !exclude.some((r) => r.test(k)));

  if (cands.length === 0) return 0;

  // 후보 중 가장 큰 값(대부분 total이 제일 큼)
  return Math.max(...cands.map(([, n]) => n));
}

async function getSiteStatsRow(): Promise<AnyRow> {
  const { data, error } = await supabaseAdmin
    .from("site_stats")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Read site_stats failed: ${error.message}`);
  if (!data) throw new Error("site_stats has no rows (empty).");
  return data as AnyRow;
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

// ✅ 총합 4개: site_stats에서 “키워드로 자동 탐지”
export async function getTotalPostsCount() {
  const s = await getSiteStatsRow();
  return bestByKeywords(
    s,
    [/post/i, /게시/i, /글/i],
    [/new/i, /today/i, /daily/i, /week/i, /month/i, /최근/i, /신규/i]
  );
}

export async function getTotalCommentsCount() {
  const s = await getSiteStatsRow();
  return bestByKeywords(
    s,
    [/comment/i, /reply/i, /댓글/i, /답글/i],
    [/new/i, /today/i, /daily/i, /week/i, /month/i, /최근/i, /신규/i]
  );
}

export async function getTotalMembersCount() {
  const s = await getSiteStatsRow();
  return bestByKeywords(
    s,
    [/member/i, /user/i, /users/i, /회원/i],
    [/new/i, /today/i, /daily/i, /active/i, /최근/i, /신규/i]
  );
}

export async function getTotalVisitsCount() {
  const s = await getSiteStatsRow();
  return bestByKeywords(
    s,
    [/visit/i, /visits/i, /pv/i, /pageview/i, /page_view/i, /hit/i, /view/i, /traffic/i, /방문/i, /조회/i],
    [/new/i, /today/i, /daily/i, /최근/i, /신규/i]
  );
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
