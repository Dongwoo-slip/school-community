import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProfileRow = {
  username?: string | null;
  role?: string | null;
  grade?: number | null;
  class_no?: number | null;
  interests?: unknown;
  points?: number | null;
  badge?: unknown;
  student_no?: string | null;
  student_verified?: boolean | null;
  student_verified_at?: string | null;
};

type VerificationRow = {
  student_no?: string | null;
  grade?: number | null;
  class_no?: number | null;
  used_at?: string | null;
};

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
      studentVerified: false,
    });
  }

  const admin = adminClient();

  // ✅ profiles에서 username/role/grade/class_no + interests/points/badge까지 가져오기
  const { data: prof, error: profErr } = await admin
    .from("profiles")
    .select("username, role, grade, class_no, interests, points, badge, student_no, student_verified, student_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    console.error("Profile Fetch Error:", profErr);
  }

  const p = prof as ProfileRow | null;
  let verification: VerificationRow | null = null;
  try {
    const { data: verificationRow } = await admin
      .from("student_verification_codes")
      .select("student_no, grade, class_no, used_at")
      .eq("used_by", user.id)
      .maybeSingle();
    verification = verificationRow;
  } catch {
    verification = null;
  }

  return NextResponse.json({
    userId: user.id,
    role: p?.role ?? "user",
    username: p?.username ?? null,
    grade: verification?.grade ?? p?.grade ?? 2,
    classNo: verification?.class_no ?? p?.class_no ?? 7,
    interests: Array.isArray(p?.interests) ? p.interests : [],
    points: Number(p?.points) || 0,
    badge: Array.isArray(p?.badge) ? p.badge : [],
    studentVerified: Boolean(verification || p?.student_verified || p?.student_no),
    studentNo: verification?.student_no ?? p?.student_no ?? null,
    verifiedGrade: verification?.grade ?? (p?.student_verified ? p?.grade : null) ?? null,
    verifiedClassNo: verification?.class_no ?? (p?.student_verified ? p?.class_no : null) ?? null,
    studentVerifiedAt: verification?.used_at ?? p?.student_verified_at ?? null,
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

  const admin = adminClient();

  const body = await req.json().catch(() => ({}));
  const grade = Number(body?.grade);
  const classNo = Number(body?.classNo);

  if (![1, 2, 3].includes(grade)) {
    return NextResponse.json({ error: "학년이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isInteger(classNo) || classNo < 1 || classNo > 11) {
    return NextResponse.json({ error: "반은 1~11만 가능합니다." }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await admin
    .from("profiles")
    .update({ grade, class_no: classNo })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (!updated) {
    const metadataUsername = String(user.user_metadata?.username ?? "").trim().toLowerCase();
    const emailUsername = String(user.email ?? "").split("@")[0]?.trim().toLowerCase();
    const username = metadataUsername || emailUsername || `user_${user.id.slice(0, 8)}`;

    const { error: insertErr } = await admin
      .from("profiles")
      .insert({ id: user.id, username, grade, class_no: classNo });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
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
