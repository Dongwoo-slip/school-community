import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/serverAuth";
import { AUTHOR_PROFILE_SELECT, type AuthorIdentity } from "@/lib/authorDisplay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_AUTHOR_PROFILE_SELECT = "username, role, points";

type AdminSupabase = ReturnType<typeof adminClient>;

async function loadActualLikeCounts(sb: AdminSupabase, postIds: string[]) {
  const likeMap = new Map<string, number>();
  const countedReactionIds = new Set<string>();

  const addRows = (rows: any[] | null | undefined, field: "action" | "kind") => {
    (rows ?? []).forEach((row) => {
      if (row?.[field] !== "like" || !row?.post_id) return;
      const postId = String(row.post_id);
      const reactionId = row?.id ? String(row.id) : `${field}:${postId}:${likeMap.get(postId) ?? 0}`;
      if (countedReactionIds.has(reactionId)) return;
      countedReactionIds.add(reactionId);
      likeMap.set(postId, (likeMap.get(postId) ?? 0) + 1);
    });
  };

  if (postIds.length === 0) return likeMap;

  const { data: actionRows, error: actionError } = await sb
    .from("post_reactions")
    .select("id,post_id,action")
    .in("post_id", postIds);

  if (!actionError) addRows(actionRows, "action");

  const { data: kindRows, error: kindError } = await sb
    .from("post_reactions")
    .select("id,post_id,kind")
    .in("post_id", postIds);

  if (!kindError) addRows(kindRows, "kind");

  return likeMap;
}

export async function GET() {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  const sb = adminClient();
  let isAdmin = false;

  if (user) {
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  const LIKE_TH = 10;
  const VIEW_TH = 50;

  const { data: rows, error } = await sb
    .from("posts")
    .select("id,title,created_at,view_count,like_count,author_id,poll")
    .eq("board", "free")
    .eq("is_deleted", false)
    .order("view_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const postIds = Array.from(new Set((rows ?? []).map((r: any) => String(r.id)).filter(Boolean)));
  const actualLikeMap = await loadActualLikeCounts(sb, postIds);

  const bestRows = (rows ?? [])
    .map((r: any) => {
      const id = String(r.id);
      const actualLikeCount = actualLikeMap.get(id) ?? Number(r.like_count ?? 0);
      return {
        ...r,
        like_count: actualLikeCount,
      };
    })
    .filter((r: any) => Number(r.view_count ?? 0) >= VIEW_TH || Number(r.like_count ?? 0) >= LIKE_TH)
    .sort((a: any, b: any) => {
      const likeDiff = Number(b.like_count ?? 0) - Number(a.like_count ?? 0);
      if (likeDiff !== 0) return likeDiff;
      const viewDiff = Number(b.view_count ?? 0) - Number(a.view_count ?? 0);
      if (viewDiff !== 0) return viewDiff;
      return Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "");
    })
    .slice(0, 200);

  const ids = Array.from(new Set(bestRows.map((r: any) => r.author_id).filter(Boolean)));
  const profileMap = new Map<string, AuthorIdentity>();

  if (ids.length > 0) {
    const profileSelect = isAdmin ? AUTHOR_PROFILE_SELECT : PUBLIC_AUTHOR_PROFILE_SELECT;
    const { data: profiles } = await sb.from("profiles").select(`id,${profileSelect}`).in("id", ids);
    (profiles ?? []).forEach((p: any) => {
      profileMap.set(p.id, p);
    });
  }

  const result = bestRows.map((r: any) => ({
    ...r,
    author: profileMap.get(r.author_id) ?? { username: null, role: "user" },
  }));

  return NextResponse.json({ data: result, likeThreshold: LIKE_TH, viewThreshold: VIEW_TH });
}
