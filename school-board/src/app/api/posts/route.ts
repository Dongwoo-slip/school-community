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

  // ✅ 빈 값/undefined/null 방어
  const raw = (searchParams.get("board") ?? "").trim();
  const board =
    !raw || raw === "undefined" || raw === "null" ? "free" : raw;

  const sb = admin();

  // ✅ content 포함
  const { data: posts, error } = await sb
    .from("posts")
    .select("id,title,content,created_at,view_count,author_id")
    .eq("board", board)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 작성자 프로필 붙이기
  const ids = Array.from(new Set((posts ?? []).map((p: any) => p.author_id).filter(Boolean)));
  const profileMap = new Map<string, { username: string | null; role: string | null }>();

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

  // ✅ 호환: data도 주고 posts도 같이 줌 (프론트 어떤 형태든 안 깨짐)
  return NextResponse.json({ data: result, posts: result });
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
