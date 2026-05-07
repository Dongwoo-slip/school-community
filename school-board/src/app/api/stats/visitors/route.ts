import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// GET: 현재 누적값 조회
export async function GET() {
  const sb = admin();
  const { data, error } = await sb
    .from("site_stats")
    .select("value")
    .eq("key", "visitors")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: data?.value ?? 0 });
}

// POST: 들어올 때마다 무조건 +1 (조회수처럼)
export async function POST() {
  const sb = admin();

  const { data, error } = await sb.rpc("increment_stat", { stat_key: "visitors" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: data ?? 0 });
}
