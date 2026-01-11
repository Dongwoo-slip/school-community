import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export async function GET() {
  const sb = await createAuthedClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;

  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  // 내 프로필 조회 (없으면 자동 생성)
  const { data, error } = await sb
    .from("user_profiles")
    .select("grade, class_no")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (!data) {
    const init = { user_id: user.id, grade: 2, class_no: 7 };
    const { error: insErr } = await sb.from("user_profiles").insert(init);
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, grade: 2, class_no: 7 });
  }

  return NextResponse.json({ ok: true, grade: data.grade, class_no: data.class_no });
}

export async function POST(req: Request) {
  const sb = await createAuthedClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;

  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const grade = clampInt(body?.grade, 1, 3, 2);
  const class_no = clampInt(body?.class_no, 1, 11, 7);

  const row = {
    user_id: user.id,
    grade,
    class_no,
    updated_at: new Date().toISOString(),
  };

  // upsert(없으면 insert, 있으면 update)
  const { error } = await sb.from("user_profiles").upsert(row, { onConflict: "user_id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, grade, class_no });
}
