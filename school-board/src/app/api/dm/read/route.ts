import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    // ✅ Next.js 16: cookies() is Promise
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    // 여기서는 기존 로직처럼 /api/me를 쿠키로 호출하는 방식이면:
    const origin = new URL(req.url).origin;
    const meRes = await fetch(`${origin}/api/me`, { cache: "no-store", headers: { cookie: cookieHeader } });
    const meJson = await meRes.json().catch(() => ({}));

    const userId = meJson?.userId ?? null;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ error: "ids가 비었습니다." }, { status: 400 });

    const supa = adminClient();

    // ✅ read 처리 예시 (너 스키마에 맞게 receiver_id/recipient_id 컬럼만 맞추면 됨)
    const { error } = await supa.from("messages").update({ read: true }).in("id", ids).eq("receiver_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, updated: ids.length }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}
