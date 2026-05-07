import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// GET /api/board?board=free
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const board = (searchParams.get("board") ?? "free").trim() || "free";

    const sb = admin();

    // ✅ me (로그인 정보)
    const authed = await createAuthedClient();
    const { data: authData } = await authed.auth.getUser();
    const user = authData.user;

    let me = { userId: null as string | null, role: "guest", username: null as string | null };

    if (user?.id) {
      const { data: profile, error: pErr } = await sb
        .from("profiles")
        .select("username,role")
        .eq("id", user.id)
        .maybeSingle();

      if (!pErr) {
        me = {
          userId: user.id,
          role: (profile?.role ?? "user") as string,
          username: (profile?.username ?? null) as string | null,
        };
      } else {
        me = { userId: user.id, role: "user", username: null };
      }
    }

    // ✅ posts
    const { data: posts, error } = await sb
      .from("posts")
      .select("id,title,created_at,view_count,author_id,poll,image_urls")
      .eq("board", board)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // author profiles
    const ids = Array.from(new Set((posts ?? []).map((p: any) => p.author_id).filter(Boolean)));
    const profileMap = new Map<string, { username: string | null; role: string | null }>();

    if (ids.length > 0) {
      const { data: profiles } = await sb.from("profiles").select("id,username,role").in("id", ids);
      (profiles ?? []).forEach((pr: any) => {
        profileMap.set(pr.id, { username: pr.username ?? null, role: pr.role ?? "user" });
      });
    }

    const result = (posts ?? []).map((p: any) => ({
      ...p,
      author: profileMap.get(p.author_id) ?? { username: null, role: "user" },
    }));

    return NextResponse.json({ me, data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
