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

function makeAnonId(userId: string) {
  const s = String(userId).replace(/-/g, "");
  return `익명${s.slice(0, 4)}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "25"), 50);
  const before = url.searchParams.get("before"); // created_at

  const sb = admin();

  // ✅ username 컬럼을 절대 조회하지 않음
  let q = sb
    .from("chat_messages")
    .select("id,content,user_id,anon_id,created_at")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const arr = data ?? [];
  const hasMore = arr.length > limit;
  const sliced = hasMore ? arr.slice(0, limit) : arr;

  return NextResponse.json({ data: sliced, hasMore });
}

export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim().slice(0, 500);
  if (!content) return NextResponse.json({ error: "내용이 비었습니다." }, { status: 400 });

  const sb = admin();

  // ✅ 도배 방지: 3초 이내 작성 여부 확인
  const { data: lastMsg } = await sb
    .from("chat_messages")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMsg) {
    const diff = Date.now() - new Date(lastMsg.created_at).getTime();
    if (diff < 3000) {
      return NextResponse.json({ error: "너무 자주 메시지를 보낼 수 없습니다. 3초 후에 다시 시도하세요." }, { status: 429 });
    }
  }

  // ✅ username 컬럼 없이 insert
  const row = {
    content,
    user_id: user.id,
    anon_id: makeAnonId(user.id),
  };
  const { data: inserted, error } = await sb
    .from("chat_messages")
    .insert(row)
    .select("id,content,user_id,anon_id,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: inserted });
}
