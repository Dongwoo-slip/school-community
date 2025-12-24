import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function supaWithCookieHeader(cookieHeader: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        cookie: cookieHeader, // ✅ 서버에서 Supabase로 쿠키 전달 (로그인 세션 판별용)
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // ✅ Next 16: cookies()는 Promise -> await 필요
    const cookieStore = await cookies();

    // cookie header로 합치기
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const supa = supaWithCookieHeader(cookieHeader);

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
    }

    // ✅ 내 쪽지(read=true)로 업데이트 (RLS 정책에 의해 내 것만 업데이트되게 설계돼 있어야 함)
    const { error, count } = await supa
      .from("messages")
      .update({ read: true })
      .in("id", ids)
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: count ?? ids.length }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}
