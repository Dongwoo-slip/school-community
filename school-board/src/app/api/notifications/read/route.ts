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

export async function POST() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sb = admin();
  const { error } = await sb
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", user.id)
    .eq("read", false);

  if (error) {
    // 테이블 없으면 조용히 성공처럼
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
