import { supabaseAdmin } from "@/lib/supabase/admin";
import { kstDateString } from "@/lib/time";

const TABLE_POSTS = "posts";       // 필요하면 변경
const TABLE_COMMENTS = "comments"; // 필요하면 변경

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

export async function getTodayVisitorsCount() {
  const today = kstDateString(new Date());
  const { count, error } = await supabaseAdmin
    .from("daily_visits")
    .select("visitor_id", { count: "exact", head: true })
    .eq("date", today);

  if (error) throw new Error(`Count daily_visits failed: ${error.message}`);
  return count ?? 0;
}

export async function getReportsSummary(since: Date) {
  const { count: newReports, error: e1 } = await supabaseAdmin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .gt("created_at", since.toISOString());

  if (e1) throw new Error(`Count new reports failed: ${e1.message}`);

  const { count: openReports, error: e2 } = await supabaseAdmin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  if (e2) throw new Error(`Count open reports failed: ${e2.message}`);

  return { newReports: newReports ?? 0, openReports: openReports ?? 0 };
}
