import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function supa() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const client = await supa();

    const { data: auth, error: authErr } = await client.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = auth.user.id;
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

    // ✅ 받은 쪽지(최신순)
    const { data, error } = await client
      .from("messages")
      .select("id,sender_id,receiver_id,content,created_at,read")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ✅ 미확인 개수 (버전 호환 위해 count 옵션 안 씀)
    const unread = (Array.isArray(data) ? data : []).filter((r: any) => r?.read === false).length;

    return NextResponse.json({ ok: true, data: data ?? [], unread }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}
