import { NextResponse } from "next/server";
import { adminClient, requireAdmin } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type VerifiedRow = {
  userId: string;
  username: string | null;
  studentNo: string | null;
  studentName: string | null;
  grade: number | null;
  classNo: number | null;
  verifiedAt: string | null;
};

function toInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function rowKey(row: VerifiedRow) {
  return row.userId || `${row.studentNo ?? ""}:${row.studentName ?? ""}`;
}

function sortVerifiedRows(a: VerifiedRow, b: VerifiedRow) {
  const gradeA = a.grade ?? 99;
  const gradeB = b.grade ?? 99;
  if (gradeA !== gradeB) return gradeA - gradeB;

  const classA = a.classNo ?? 99;
  const classB = b.classNo ?? 99;
  if (classA !== classB) return classA - classB;

  return String(a.studentNo ?? a.username ?? "").localeCompare(String(b.studentNo ?? b.username ?? ""), "ko");
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const sb = adminClient();
  const [{ data: profiles, error: profileError }, { data: codes, error: codeError }] = await Promise.all([
    sb
      .from("profiles")
      .select("id, username, grade, class_no, student_no, student_name, student_verified, student_verified_at, verification_code_id"),
    sb
      .from("student_verification_codes")
      .select("id, student_no, student_name, grade, class_no, used_by, used_at")
      .not("used_by", "is", null),
  ]);

  if (profileError) return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  if (codeError) return NextResponse.json({ ok: false, error: codeError.message }, { status: 500 });

  const profileById = new Map<string, any>();
  (profiles ?? []).forEach((profile: any) => {
    if (profile?.id) profileById.set(String(profile.id), profile);
  });

  const map = new Map<string, VerifiedRow>();

  (codes ?? []).forEach((code: any) => {
    const userId = String(code.used_by ?? "");
    if (!userId) return;

    const profile = profileById.get(userId);
    const row: VerifiedRow = {
      userId,
      username: profile?.username ?? null,
      studentNo: code.student_no ?? profile?.student_no ?? null,
      studentName: code.student_name ?? profile?.student_name ?? null,
      grade: toInt(code.grade ?? profile?.grade),
      classNo: toInt(code.class_no ?? profile?.class_no),
      verifiedAt: code.used_at ?? profile?.student_verified_at ?? null,
    };
    map.set(rowKey(row), row);
  });

  (profiles ?? []).forEach((profile: any) => {
    const verified = Boolean(
      profile?.student_verified ||
      profile?.student_no ||
      profile?.student_name ||
      profile?.verification_code_id
    );
    if (!verified || !profile?.id) return;

    const row: VerifiedRow = {
      userId: String(profile.id),
      username: profile.username ?? null,
      studentNo: profile.student_no ?? null,
      studentName: profile.student_name ?? null,
      grade: toInt(profile.grade),
      classNo: toInt(profile.class_no),
      verifiedAt: profile.student_verified_at ?? null,
    };
    if (!map.has(rowKey(row))) map.set(rowKey(row), row);
  });

  const rows = Array.from(map.values()).sort(sortVerifiedRows);
  const byGrade: Record<string, number> = {};
  const byClass: Record<string, Record<string, number>> = {};

  rows.forEach((row) => {
    const grade = row.grade ? String(row.grade) : "unknown";
    const classNo = row.classNo ? String(row.classNo) : "unknown";
    byGrade[grade] = (byGrade[grade] ?? 0) + 1;
    byClass[grade] = byClass[grade] ?? {};
    byClass[grade][classNo] = (byClass[grade][classNo] ?? 0) + 1;
  });

  return NextResponse.json({
    ok: true,
    data: {
      total: rows.length,
      byGrade,
      byClass,
      rows,
    },
  });
}
