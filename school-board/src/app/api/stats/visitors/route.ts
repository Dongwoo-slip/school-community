import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { kstDateString } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

async function readVisitorCounts(sb: ReturnType<typeof admin>) {
  const todayKey = `visitors:daily:${kstDateString()}`;

  const { data, error } = await sb
    .from("site_stats")
    .select("value")
    .eq("key", "visitors")
    .maybeSingle();

  if (error) throw new Error(error.message);

  const { data: todayData, error: todayError } = await sb
    .from("site_stats")
    .select("value")
    .eq("key", todayKey)
    .maybeSingle();

  if (todayError) throw new Error(todayError.message);

  return { count: data?.value ?? 0, today: todayData?.value ?? 0 };
}

// GET: 현재 누적값 조회
export async function GET() {
  try {
    const sb = admin();
    return NextResponse.json(await readVisitorCounts(sb));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

// POST: 방문 기록. 새로고침/재접속마다 방문수로 기록합니다.
export async function POST() {
  const sb = admin();
  const ymd = kstDateString();
  const todayKey = `visitors:daily:${ymd}`;

  const { error } = await sb.rpc("increment_stat", { stat_key: "visitors" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.rpc("increment_stat", { stat_key: todayKey });

  const counts = await readVisitorCounts(sb).catch((e: any) => ({ error: e?.message ?? "unknown error", count: 0, today: 0 }));
  return NextResponse.json({ ok: true, counted: true, ...counts });
}
