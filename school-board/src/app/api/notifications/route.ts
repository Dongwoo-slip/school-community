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

export async function GET() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다.", data: [], unread: 0 }, { status: 401 });

  const sb = admin();
  const { data: rows, error } = await sb
    .from("notifications")
    .select("id,type,actor_username,post_id,created_at,read")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ data: [], unread: 0 });

  const unread = (rows ?? []).filter((r: any) => r.read === false).length;
  return NextResponse.json({ data: rows ?? [], unread });
}
