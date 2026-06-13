import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const { data, error } = await admin()
    .from("posts")
    .select("id,title,content,image_urls,created_at,updated_at")
    .eq("board", "ad")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const res = NextResponse.json({ ok: true, data: data ?? null });
  res.headers.set("Cache-Control", PUBLIC_CACHE);
  return res;
}
