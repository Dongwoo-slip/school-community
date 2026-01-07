import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kstDateString } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomId() {
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  const today = kstDateString(new Date());

  const existingVid = req.cookies.get("sq_vid")?.value;
  const vid = existingVid || randomId();

  const { error } = await supabaseAdmin.from("daily_visits").upsert({ date: today, visitor_id: vid });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const res = NextResponse.json({ ok: true });

  if (!existingVid) {
    res.cookies.set("sq_vid", vid, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}
