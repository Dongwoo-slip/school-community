import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getUserId() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  return data.user?.id ?? null;
}

export async function POST() {
  const start = Date.now();
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const supa = adminClient();

    // receiver_id 방식 먼저
    {
      const { error } = await supa
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", userId)
        .eq("read", false);

      if (error && String(error.message || "").toLowerCase().includes("receiver_id")) {
        // recipient_id 방식
        const { error: error2 } = await supa
          .from("messages")
          .update({ read: true })
          .eq("recipient_id", userId)
          .eq("read", false);

        if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
      } else if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    console.log(JSON.stringify({
      level: "info",
      route: "/api/messages/read",
      ms: Date.now() - start,
    }));

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    console.error(JSON.stringify({
      level: "error",
      route: "/api/messages/read",
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : "서버 오류",
    }));
    return NextResponse.json({ error: e instanceof Error ? e.message : "서버 오류" }, { status: 500 });
  }
}
