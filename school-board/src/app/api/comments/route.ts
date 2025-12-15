import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// GET /api/comments?post_id=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const post_id = searchParams.get("post_id");
  if (!post_id) return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });

  const sb = admin();
  const { data: rows, error } = await sb
    .from("comments")
    .select("id,post_id,author_id,content,created_at")
    .eq("post_id", post_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = Array.from(new Set((rows ?? []).map((r: any) => r.author_id).filter(Boolean)));
  const profileMap = new Map<string, { username: string | null; role: string | null }>();

  if (ids.length > 0) {
    const { data: profiles } = await sb.from("profiles").select("id,username,role").in("id", ids);
    (profiles ?? []).forEach((p: any) => {
      profileMap.set(p.id, { username: p.username ?? null, role: p.role ?? "user" });
    });
  }

  return NextResponse.json({
    data: (rows ?? []).map((r: any) => ({
      ...r,
      author: profileMap.get(r.author_id) ?? { username: null, role: "user" },
    })),
  });
}

// POST /api/comments (로그인 필요)
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const post_id = String(body.post_id ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!post_id) return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  if (content.length < 1) return NextResponse.json({ error: "댓글을 입력하세요." }, { status: 400 });

  const sb = admin();
  const { data, error } = await sb
    .from("comments")
    .insert({ post_id, author_id: user.id, content })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
