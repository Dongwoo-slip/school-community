import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  try {
    // ✅ site_stats 누적 방문수 +1 (DB RPC)
    const { data, error } = await supabaseAdmin.rpc("increment_site_stats_visits");
    if (error) throw new Error(`increment_site_stats_visits failed: ${error.message}`);

    return NextResponse.json({ ok: true, total_visits: Number(data ?? 0) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
