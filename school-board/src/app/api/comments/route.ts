import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// GET /api/comments?postId=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "postId가 필요합니다." }, { status: 400 });

  const sb = admin();
  const { data: rows, error } = await sb
    .from("comments")
    .select("id,post_id,author_id,content,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = Array.from(new Set((rows ?? []).map((c: any) => c.author_id).filter(Boolean)));
  let profileMap = new Map<string, { username: string | null; role: string | null }>();

  if (ids.length > 0) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id,username,role")
      .in("id", ids);

    (profiles ?? []).forEach((pr: any) => {
      profileMap.set(pr.id, { username: pr.username ?? null, role: pr.role ?? "user" });
    });
  }

  const result = (rows ?? []).map((c: any) => ({
    ...c,
    author: profileMap.get(c.author_id) ?? { username: null, role: "user" },
  }));

  return NextResponse.json({ data: result });
}

// POST /api/comments
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const postId = String(body.postId ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!postId) return NextResponse.json({ error: "postId가 필요합니다." }, { status: 400 });
  if (content.length < 1) return NextResponse.json({ error: "댓글을 입력하세요." }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "댓글은 500자 이하" }, { status: 400 });

  const sb = admin();
  const { data, error } = await sb
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, content })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
