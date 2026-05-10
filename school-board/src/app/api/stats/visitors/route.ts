import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { kstDateString } from "@/lib/time";
import { requireAdmin } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// GET: 현재 누적값 조회
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = admin();
  const todayKey = `visitors:daily:${kstDateString()}`;

  const { data, error } = await sb
    .from("site_stats")
    .select("value")
    .eq("key", "visitors")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: todayData } = await sb
    .from("site_stats")
    .select("value")
    .eq("key", todayKey)
    .maybeSingle();

  return NextResponse.json({ count: data?.value ?? 0, today: todayData?.value ?? 0 });
}

function visitorMarker(req: NextRequest, ymd: string) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  const hash = createHash("sha256").update(`${ymd}:${ip}:${ua}`).digest("hex").slice(0, 32);
  return `visitors:seen:${ymd}:${hash}`;
}

// POST: 방문 기록. 같은 브라우저/IP/UA는 하루 1회만 증가시켜 통계 조작 부담을 줄임.
export async function POST(req: NextRequest) {
  const sb = admin();
  const ymd = kstDateString();
  const todayKey = `visitors:daily:${ymd}`;
  const cookieName = `sq_visit_${ymd}`;
  const markerKey = visitorMarker(req, ymd);

  const hasCookie = req.cookies.get(cookieName)?.value === "1";
  const { data: existingMarker } = hasCookie
    ? { data: { key: markerKey } }
    : await sb.from("site_stats").select("key").eq("key", markerKey).maybeSingle();

  let didCount = false;
  if (!existingMarker) {
    const { error: markErr } = await sb.from("site_stats").insert({ key: markerKey, value: 1 });
    if (!markErr) {
      didCount = true;
      const { error } = await sb.rpc("increment_stat", { stat_key: "visitors" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await sb.rpc("increment_stat", { stat_key: todayKey });
    }
  }

  const res = NextResponse.json({ ok: true, counted: didCount });
  res.cookies.set(cookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}
