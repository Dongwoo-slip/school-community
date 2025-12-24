import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
    }

    const { data: u, error: uerr } = await supabase.auth.getUser();
    if (uerr || !u?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // ✅ 1) receiver_id 스키마 시도
    {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", ids)
        .eq("receiver_id", u.user.id)
        .select("id"); // ✅ 옵션 제거 (supabase 타입 호환)

      if (!error) {
        return NextResponse.json({ ok: true, updated: ids.length }, { status: 200 });
      }

      const msg = String(error.message || "").toLowerCase();
      if (!msg.includes("receiver_id") && !msg.includes("column")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      // receiver_id 컬럼이 없으면 fallback
    }

    // ✅ 2) recipient_id 스키마 fallback
    {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", ids)
        .eq("recipient_id", u.user.id)
        .select("id"); // ✅ 옵션 제거

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, updated: ids.length }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}
