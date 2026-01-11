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
      interests: [],
    });
  }

  // ✅ profiles에서 username/role/grade/class_no + interests까지 가져오기
  const { data: prof } = await sb
    .from("profiles")
    .select("username, role, grade, class_no, interests")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    userId: user.id,
    role: prof?.role ?? "user",
    username: prof?.username ?? null,
    grade: prof?.grade ?? 2,
    classNo: prof?.class_no ?? 7,
    interests: Array.isArray(prof?.interests) ? prof!.interests : [],
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
  const { error: upsertErr } = await sb.from("profiles").upsert(
    { id: user.id, grade, class_no: classNo },
    { onConflict: "id" }
  );

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return Next_attachR(
    NextResponse.json({ ok: true, grade, classNo })
  );
}

/**
 * (선택) 일부 환경에서 NextResponse가 미묘하게 타입/캐시로 꼬일 때 방지용.
 * 필요 없으면 위 PATCH의 return을 그냥 NextResponse.json(...)으로 바꿔도 됨.
 */
function Next_attachR(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  return res;
}
