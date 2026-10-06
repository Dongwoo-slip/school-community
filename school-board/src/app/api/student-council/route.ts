import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/serverAuth";
import { isStudentCouncilCategory } from "@/lib/studentCouncil";
import {
  isStudentCouncilSchemaMissing,
  requireStudentCouncilAccess,
  STUDENT_COUNCIL_POST_SELECT,
} from "@/lib/studentCouncilServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await requireStudentCouncilAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const categoryValue = req.nextUrl.searchParams.get("category");
  const limitValue = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Math.max(1, Math.min(Number.isFinite(limitValue) ? limitValue : 50, 100));

  let query = adminClient()
    .from("student_council_posts")
    .select(STUDENT_COUNCIL_POST_SELECT)
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (isStudentCouncilCategory(categoryValue)) query = query.eq("category", categoryValue);

  const { data, error } = await query;
  if (error) {
    if (isStudentCouncilSchemaMissing(error)) {
      console.warn("[student-council] schema is not ready", { code: error.code });
      return NextResponse.json({
        data: [],
        featureEnabled: false,
        isAdmin: auth.isAdmin,
        available: false,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    featureEnabled: auth.featureEnabled,
    isAdmin: auth.isAdmin,
    available: true,
  });
}
