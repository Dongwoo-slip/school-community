import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Missing env");
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

async function getMeFromApi(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const cookie = req.headers.get("cookie") ?? "";
  const res = await fetch(`${origin}/api/me`, { cache: "no-store", headers: { cookie } });
  const json = await res.json().catch(() => ({}));
  return { userId: json?.userId ?? null };
}

export async function POST(req: NextRequest) {
  try {
    const me = await getMeFromApi(req);
    if (!me.userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const supa = adminClient();

    // receiver_id 방식 먼저
    let updated = 0;

    {
      const { data, error } = await supa
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", me.userId)
        .eq("read", false)
        .select("id");

      if (!error) updated = Array.isArray(data) ? data.length : 0;
      else if (String(error.message || "").toLowerCase().includes("receiver_id")) {
        // recipient_id 방식
        const { data: data2, error: error2 } = await supa
          .from("messages")
          .update({ read: true })
          .eq("recipient_id", me.userId)
          .eq("read", false)
          .select("id");

        if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
        updated = Array.isArray(data2) ? data2.length : 0;
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}
