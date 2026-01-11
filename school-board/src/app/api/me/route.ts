import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const sb = await createAuthedClient();
  const { data } = await sb.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({
      userId: null,
      role: "guest",
      username: null,
      grade: null,
      classNo: null,
    });
  }

  const { data: prof } = await sb
    .from("profiles")
    .select("username, role, grade, class_no")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    userId: user.id,
    role: prof?.role ?? "user",
    username: prof?.username ?? null,
    grade: prof?.grade ?? 2,
    classNo: prof?.class_no ?? 7,
  });
}

/**
 * ✅ 학년/반 저장
 * body: { grade: number, classNo: number }
 */
export async function PATCH(req: Request) {
  const sb = await createAuthedClient();
  const { data } = await sb.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const grade = Number(body?.grade);
  const classNo = Number(body?.classNo);

  if (![1, 2, 3].includes(grade)) {
    return NextResponse.json({ error: "학년이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isInteger(classNo) || classNo < 1 || classNo > 11) {
    return NextResponse.json({ error: "반은 1~11만 가능합니다." }, { status: 400 });
  }

  // ✅ profiles에 update (대부분 row 존재)
  // row가 없더라도 대비해서 upsert 시도
  const { error: upsertErr } = await sb
    .from("profiles")
    .upsert(
      { id: user.id, grade, class_no: classNo },
      { onConflict: "id" }
    );

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, grade, classNo });
}
