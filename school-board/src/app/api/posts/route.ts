import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// GET /api/posts?board=free
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const board = searchParams.get("board") ?? "free";

  const sb = admin();

<<<<<<< HEAD
  const { data: posts, error } = await sb
    .from("posts")
    .select("id,title,created_at,view_count,author_id")
=======
  // ✅✅✅ 여기만 핵심 변경: content 추가
  const { data: posts, error } = await sb
    .from("posts")
    .select("id,title,content,created_at,view_count,author_id")
>>>>>>> b3138e5 (deploy)
    .eq("board", board)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = Array.from(new Set((posts ?? []).map((p: any) => p.author_id).filter(Boolean)));
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

  const result = (posts ?? []).map((p: any) => ({
    ...p,
    author: profileMap.get(p.author_id) ?? { username: null, role: "user" },
  }));

<<<<<<< HEAD
=======
  // ✅ 원문 유지: 반드시 { data: result } 형태로 반환
>>>>>>> b3138e5 (deploy)
  return NextResponse.json({ data: result });
}

// POST /api/posts  (로그인 필요)
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const board = body.board ?? "free";
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (title.length < 4) return NextResponse.json({ error: "제목은 4글자 이상" }, { status: 400 });
  if (content.length < 4) return NextResponse.json({ error: "본문은 4글자 이상" }, { status: 400 });

  const sb = admin();
  const { data, error } = await sb
    .from("posts")
    .insert({
      board,
      title,
      content,
      author_id: user.id,
      view_count: 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
