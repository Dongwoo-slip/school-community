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

const TABLE = "chat_messages";
const ROOM = "global";

function makeAnonName(userId: string) {
  // 완전 익명 느낌 + 고정(유저마다 같은 익명닉)
  const tail = userId.replace(/-/g, "").slice(-4).toUpperCase();
  return `익명${tail}`;
}

// GET /api/chat?limit=25&before=2025-12-18T... (optional)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 25), 1), 50);
  const before = searchParams.get("before"); // created_at 기준 페이지네이션

  const sb = admin();

  let q = sb
    .from(TABLE)
    .select("id,room,content,anon_id,created_at,user_id")
    .eq("room", ROOM)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;

  if (error) return NextResponse.json({ error: error.message, data: [], hasMore: false }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    hasMore: (data ?? []).length === limit,
  });
}

// POST /api/chat  (로그인 필요)
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const content = String(body?.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });

  const sb = admin();

  // ✅ 핵심: room + user_id 항상 저장 → 새로고침되어도 안 사라짐
  const insertRow = {
    room: ROOM,
    content,
    user_id: user.id,
    anon_id: makeAnonName(user.id),
  };

  const { data: row, error } = await sb.from(TABLE).insert(insertRow).select("id,room,content,anon_id,created_at,user_id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: row });
}
