import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "40"), 80);
  const before = url.searchParams.get("before"); // created_at
  const tag = (url.searchParams.get("tag") ?? "").trim();
  const q = (url.searchParams.get("q") ?? "").trim();

  const sb = admin();

  let query = sb
    .from("posts")
    .select("id,title,created_at,view_count,author_id,tags,author:profiles(username,role)")
    .eq("board", "jobs")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) query = query.lt("created_at", before);
  if (tag) query = query.contains("tags", [tag]);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const arr = data ?? [];
  const hasMore = arr.length > limit;
  const sliced = hasMore ? arr.slice(0, limit) : arr;

  return NextResponse.json({ data: sliced, hasMore });
}

export async function POST(req: Request) {
  const sbAuthed = await createAuthedClient();
  const { data } = await sbAuthed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  const content = String(body?.content ?? "").trim();
  const tags = Array.isArray(body?.tags) ? body.tags.map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, 8) : [];

  if (title.length < 2) return NextResponse.json({ error: "제목을 2글자 이상 입력해줘" }, { status: 400 });
  if (content.length < 2) return NextResponse.json({ error: "내용을 2글자 이상 입력해줘" }, { status: 400 });

  const sb = admin();

  const row = {
    board: "jobs",
    title,
    content,
    tags,
    author_id: user.id,
  };

  const { data: inserted, error } = await sb
    .from("posts")
    .insert(row)
    .select("id,title,created_at,view_count,author_id,tags,author:profiles(username,role)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: inserted });
}
