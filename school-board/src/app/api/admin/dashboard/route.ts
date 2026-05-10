import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { kstDateString } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

async function requireAdmin() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false as const, status: 401, error: "로그인이 필요합니다." };

  const sb = admin();
  const { data: profile, error } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error) return { ok: false as const, status: 500, error: error.message };
  if ((profile as any)?.role !== "admin") return { ok: false as const, status: 403, error: "권한이 없습니다." };

  return { ok: true as const };
}

function startOfTodayKst() {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  kst.setHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000).toISOString();
}

async function safeCount(sb: ReturnType<typeof admin>, table: string, apply?: (q: any) => any) {
  try {
    let q = sb.from(table).select("id", { count: "exact", head: true });
    if (apply) q = apply(q);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function safeRows(sb: ReturnType<typeof admin>, table: string, select: string, apply?: (q: any) => any) {
  try {
    let q = sb.from(table).select(select);
    if (apply) q = apply(q);
    const { data, error } = await q;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

async function countUsers(sb: ReturnType<typeof admin>) {
  let total = 0;
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) return total;
    total += data.users.length;
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 100) break;
  }

  return total;
}

async function recentUsers(sb: ReturnType<typeof admin>) {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return [];
  return data.users
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 6)
    .map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const sb = admin();
  const today = startOfTodayKst();
  const todayVisitorKey = `visitors:daily:${kstDateString()}`;

  const [
    totalUsers,
    usersToday,
    totalVisitsRows,
    todayVisitsRows,
    totalPosts,
    visiblePosts,
    archivedPosts,
    postsToday,
    totalComments,
    commentsToday,
    chatMessages,
    chatToday,
    privateMessages,
    unreadPrivateMessages,
    reportNotis,
    unreadReportNotis,
    postReports,
    deletedLogs,
    editLogs,
    activePopups,
    activeAds,
    recentPostRows,
    topPostRows,
    recentReportRows,
    userRows,
  ] = await Promise.all([
    countUsers(sb),
    safeCount(sb, "profiles", (q) => q.gte("created_at", today)),
    safeRows(sb, "site_stats", "value", (q) => q.eq("key", "visitors").maybeSingle()),
    safeRows(sb, "site_stats", "value", (q) => q.eq("key", todayVisitorKey).maybeSingle()),
    safeCount(sb, "posts"),
    safeCount(sb, "posts", (q) => q.eq("is_deleted", false)),
    safeCount(sb, "posts", (q) => q.eq("is_deleted", true)),
    safeCount(sb, "posts", (q) => q.gte("created_at", today)),
    safeCount(sb, "comments"),
    safeCount(sb, "comments", (q) => q.gte("created_at", today)),
    safeCount(sb, "chat_messages"),
    safeCount(sb, "chat_messages", (q) => q.gte("created_at", today)),
    safeCount(sb, "messages"),
    safeCount(sb, "messages", (q) => q.eq("read", false)),
    safeCount(sb, "notifications", (q) => q.eq("type", "report")),
    safeCount(sb, "notifications", (q) => q.eq("type", "report").eq("read", false)),
    safeCount(sb, "post_reports"),
    safeCount(sb, "deleted_posts", (q) => q.not("title", "like", "[수정 로그]%")),
    safeCount(sb, "deleted_posts", (q) => q.like("title", "[수정 로그]%")),
    safeCount(sb, "posts", (q) => q.eq("board", "popup").eq("is_deleted", false)),
    safeCount(sb, "posts", (q) => q.eq("board", "ad").eq("is_deleted", false)),
    safeRows(sb, "posts", "id,board,title,created_at,view_count,like_count,author_id", (q) =>
      q.eq("is_deleted", false).order("created_at", { ascending: false }).limit(8)
    ),
    safeRows(sb, "posts", "id,board,title,created_at,view_count,like_count,author_id", (q) =>
      q.eq("is_deleted", false).order("view_count", { ascending: false }).limit(6)
    ),
    safeRows(sb, "notifications", "id,actor_username,post_id,created_at,read,type", (q) =>
      q.eq("type", "report").order("created_at", { ascending: false }).limit(6)
    ),
    recentUsers(sb),
  ]);

  const posts = [...recentPostRows, ...topPostRows];
  const authorIds = Array.from(new Set(posts.map((p: any) => p.author_id).filter(Boolean).map(String)));
  const authorMap = new Map<string, string | null>();
  if (authorIds.length) {
    const { data: profiles } = await sb.from("profiles").select("id,username").in("id", authorIds);
    (profiles ?? []).forEach((p: any) => authorMap.set(String(p.id), p.username ?? null));
  }

  const normalizePost = (p: any) => ({
    ...p,
    author_username: p.author_id ? authorMap.get(String(p.author_id)) ?? null : null,
  });

  const totalVisits = Array.isArray(totalVisitsRows)
    ? Number((totalVisitsRows[0] as any)?.value ?? 0)
    : Number((totalVisitsRows as any)?.value ?? 0);
  const todayVisits = Array.isArray(todayVisitsRows)
    ? Number((todayVisitsRows[0] as any)?.value ?? 0)
    : Number((todayVisitsRows as any)?.value ?? 0);

  return NextResponse.json({
    ok: true,
    data: {
      generated_at: new Date().toISOString(),
      today_start: today,
      cards: {
        totalUsers,
        usersToday,
        totalVisits,
        todayVisits,
        totalPosts,
        visiblePosts,
        archivedPosts,
        postsToday,
        totalComments,
        commentsToday,
        chatMessages,
        chatToday,
        privateMessages,
        unreadPrivateMessages,
        reportNotis,
        unreadReportNotis,
        postReports,
        deletedLogs,
        editLogs,
        activePopups,
        activeAds,
      },
      recentPosts: recentPostRows.map(normalizePost),
      topPosts: topPostRows.map(normalizePost),
      recentReports: recentReportRows,
      recentUsers: userRows,
    },
  });
}
