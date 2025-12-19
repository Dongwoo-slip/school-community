import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const sb = admin();

  const LIKE_TH = 10;
  const VIEW_TH = 50;

  const { data: rows, error } = await sb
    .from("free_posts_with_likes")
    .select("id,title,created_at,view_count,like_count,author_id,poll")
    .or(`view_count.gte.${VIEW_TH},like_count.gte.${LIKE_TH}`)
    .order("like_count", { ascending: false })
    .order("view_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = Array.from(new Set((rows ?? []).map((r: any) => r.author_id).filter(Boolean)));
  const profileMap = new Map<string, { username: string | null; role: string | null }>();

  if (ids.length > 0) {
    const { data: profiles } = await sb.from("profiles").select("id,username,role").in("id", ids);
    (profiles ?? []).forEach((p: any) => {
      profileMap.set(p.id, { username: p.username ?? null, role: p.role ?? "user" });
    });
  }

  const result = (rows ?? []).map((r: any) => ({
    ...r,
    author: profileMap.get(r.author_id) ?? { username: null, role: "user" },
  }));

  return NextResponse.json({ data: result, likeThreshold: LIKE_TH, viewThreshold: VIEW_TH });
}
