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

function normRow(r: any) {
  // 프론트 호환: recipient_id로도 쓰게 만들어줌
  if (r?.recipient_id && !r?.receiver_id) r.receiver_id = r.recipient_id;
  if (r?.receiver_id && !r?.recipient_id) r.recipient_id = r.receiver_id;
  return r;
}

export async function GET(req: NextRequest) {
  try {
    const me = await getMeFromApi(req);
    if (!me.userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const supa = adminClient();

    // 1) receiver_id로 조회 시도
    let rows: any[] = [];
    {
      const { data, error } = await supa
        .from("messages")
        .select("id, sender_id, receiver_id, recipient_id, content, created_at, read")
        .eq("receiver_id", me.userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error && Array.isArray(data)) rows = data;
      else if (String(error?.message || "").toLowerCase().includes("receiver_id")) {
        // receiver_id 컬럼이 없으면 recipient_id로 재시도
        const { data: data2, error: error2 } = await supa
          .from("messages")
          .select("id, sender_id, recipient_id, content, created_at, read")
          .eq("recipient_id", me.userId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
        rows = Array.isArray(data2) ? data2 : [];
      } else if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    rows = rows.map(normRow);

    const unread = rows.filter((r) => r?.recipient_id === me.userId && r?.read === false).length;

    return NextResponse.json({ data: rows, unread }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}
