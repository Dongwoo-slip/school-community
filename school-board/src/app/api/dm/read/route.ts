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

export async function POST(req: NextRequest) {
  try {
    const client = await supa();

    const { data: auth, error: authErr } = await client.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const userId = auth.user.id;

    const body = await req.json().catch(() => ({}));
    const idsRaw = body?.ids;

    const ids: string[] = Array.isArray(idsRaw) ? idsRaw.map(String).filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "ids가 필요합니다. (예: { ids: ['uuid1','uuid2'] })" }, { status: 400 });
    }

    const { data, error } = await client
      .from("messages")
      .update({ read: true })
      .in("id", ids)
      .eq("receiver_id", userId)
      .select("id"); // ✅ 옵션(count/head) 안 씀: TS 호환

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const updated = Array.isArray(data) ? data.length : 0;
    return NextResponse.json({ ok: true, updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}
