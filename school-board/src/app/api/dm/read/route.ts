import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    // ✅ Next 16: cookies()는 Promise -> 반드시 await
    const cookieStore = await cookies();

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        // ✅ 여기서 cookies()를 다시 호출하지 말고, 위에서 만든 cookieStore를 사용
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
    }

    // 로그인 체크(내 DM만 읽음 처리하도록)
    const { data: u, error: uerr } = await supabase.auth.getUser();
    if (uerr || !u?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // ✅ 너 프로젝트는 messages 컬럼명이 receiver_id/recipient_id 둘 중 하나일 수 있어서 방어적으로 처리
    // 1) receiver_id 스키마 가정
    {
      const { error, count } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", ids)
        .eq("receiver_id", u.user.id)
        .select("id", { count: "exact", head: true });

      if (!error) {
        return NextResponse.json({ ok: true, updated: count ?? ids.length }, { status: 200 });
      }

      // receiver_id가 없다는 류면 아래 fallback으로
      const msg = String(error.message || "").toLowerCase();
      if (!msg.includes("receiver_id") && !msg.includes("column")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // 2) recipient_id fallback
    {
      const { error, count } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", ids)
        .eq("recipient_id", u.user.id)
        .select("id", { count: "exact", head: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, updated: count ?? ids.length }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}
