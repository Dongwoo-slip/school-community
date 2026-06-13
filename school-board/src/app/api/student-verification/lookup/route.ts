import { NextResponse } from "next/server";
import { adminClient } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeCode(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

function setupError(message?: string) {
  return /student_verification_codes|student_no|does not exist|schema cache/i.test(message ?? "");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = normalizeCode(body?.code);

  if (code.length < 4 || code.length > 40) {
    return NextResponse.json({ error: "인증코드를 올바르게 입력해 주세요." }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from("student_verification_codes")
    .select("student_no, active, used_by")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    const status = setupError(error.message) ? 503 : 500;
    return NextResponse.json(
      { error: setupError(error.message) ? "인증코드 테이블이 아직 준비되지 않았습니다." : error.message },
      { status }
    );
  }

  if (!data || data.active === false) {
    return NextResponse.json({ error: "일치하는 인증코드가 없습니다." }, { status: 404 });
  }

  if (data.used_by) {
    return NextResponse.json({ error: "이미 사용된 인증코드입니다." }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    studentNo: data.student_no ?? null,
  });
}
