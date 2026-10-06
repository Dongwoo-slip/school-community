import { NextResponse } from "next/server";
import { adminClient, requireAdmin } from "@/lib/serverAuth";
import {
  getStudentCouncilSetting,
  isStudentCouncilSchemaMissing,
  STUDENT_COUNCIL_UNAVAILABLE_MESSAGE,
} from "@/lib/studentCouncilServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const setting = await getStudentCouncilSetting();
  return NextResponse.json({
    featureEnabled: setting.featureEnabled,
    available: !setting.error,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.featureEnabled !== "boolean") {
    return NextResponse.json({ error: "공개 여부 값이 올바르지 않습니다." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await adminClient()
    .from("student_council_settings")
    .upsert(
      {
        id: "global",
        feature_enabled: body.featureEnabled,
        updated_at: now,
        updated_by: auth.user.id,
      },
      { onConflict: "id" },
    )
    .select("feature_enabled,updated_at")
    .single();

  if (error) {
    if (isStudentCouncilSchemaMissing(error)) {
      return NextResponse.json({ error: STUDENT_COUNCIL_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    featureEnabled: Boolean(data.feature_enabled),
    updatedAt: data.updated_at,
  });
}
