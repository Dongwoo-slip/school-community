import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeCode(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

function setupError(message?: string) {
  return /student_verification_codes|student_verified|verification_code_id|student_no|student_name|does not exist|schema cache|permission denied/i.test(message ?? "");
}

export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = normalizeCode(body?.code);

  if (code.length < 4 || code.length > 40) {
    return NextResponse.json({ error: "인증코드를 올바르게 입력해 주세요." }, { status: 400 });
  }

  const sb = adminClient();
  const { data: alreadyClaimed, error: alreadyError } = await sb
    .from("student_verification_codes")
    .select("id, code, student_no, student_name, grade, class_no, used_at")
    .eq("used_by", user.id)
    .maybeSingle();

  if (alreadyError) {
    const status = setupError(alreadyError.message) ? 503 : 500;
    return NextResponse.json(
      { error: setupError(alreadyError.message) ? "인증코드 테이블이 아직 준비되지 않았습니다." : alreadyError.message },
      { status }
    );
  }

  if (alreadyClaimed && alreadyClaimed.code !== code) {
    return NextResponse.json({ error: "이미 다른 인증코드로 인증된 계정입니다." }, { status: 409 });
  }

  const { data: found, error: findError } = await sb
    .from("student_verification_codes")
    .select("id, student_no, student_name, grade, class_no, active, used_by")
    .eq("code", code)
    .maybeSingle();

  if (findError) {
    const status = setupError(findError.message) ? 503 : 500;
    return NextResponse.json(
      { error: setupError(findError.message) ? "인증코드 테이블이 아직 준비되지 않았습니다." : findError.message },
      { status }
    );
  }

  if (!found || found.active === false) {
    return NextResponse.json({ error: "일치하는 인증코드가 없습니다." }, { status: 404 });
  }

  if (found.used_by && found.used_by !== user.id) {
    return NextResponse.json({ error: "이미 사용된 인증코드입니다." }, { status: 409 });
  }

  const now = new Date().toISOString();
  let row: { id: string; student_no?: string | null; student_name: string; grade: number; class_no: number } = found;

  if (!found.used_by) {
    const { data: claimed, error: claimError } = await sb
      .from("student_verification_codes")
      .update({ used_by: user.id, used_at: now, updated_at: now })
      .eq("id", found.id)
      .is("used_by", null)
      .select("id, student_no, student_name, grade, class_no")
      .maybeSingle();

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    if (!claimed) {
      return NextResponse.json({ error: "방금 다른 계정에서 사용된 인증코드입니다." }, { status: 409 });
    }

    row = claimed;
  }

  const { error: profileError } = await sb.from("profiles").upsert(
    {
      id: user.id,
      grade: row.grade,
      class_no: row.class_no,
      student_verified: true,
      student_no: row.student_no ?? null,
      student_name: row.student_name,
      student_verified_at: now,
      verification_code_id: row.id,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("Student verification profile sync failed:", profileError);
  }

  return NextResponse.json({
    ok: true,
    studentNo: row.student_no ?? null,
    studentName: row.student_name,
    grade: row.grade,
    classNo: row.class_no,
    profileSynced: !profileError,
  });
}
