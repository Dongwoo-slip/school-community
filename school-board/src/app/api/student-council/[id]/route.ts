import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/serverAuth";
import {
  isStudentCouncilSchemaMissing,
  requireStudentCouncilAccess,
  STUDENT_COUNCIL_POST_SELECT,
  STUDENT_COUNCIL_UNAVAILABLE_MESSAGE,
} from "@/lib/studentCouncilServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireStudentCouncilAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const preview = auth.isAdmin && req.nextUrl.searchParams.get("preview") === "1";
  let query = adminClient()
    .from("student_council_posts")
    .select(STUDENT_COUNCIL_POST_SELECT)
    .eq("id", id);

  if (!preview) query = query.eq("is_published", true);

  const { data: post, error } = await query.maybeSingle();
  if (error) {
    if (isStudentCouncilSchemaMissing(error)) {
      return NextResponse.json({ error: STUDENT_COUNCIL_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  const sb = adminClient();
  const { data: acknowledgement } = await sb
    .from("student_council_acknowledgements")
    .select("id,acknowledged_at")
    .eq("post_id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!auth.isAdmin) {
    await sb.from("student_council_post_views").insert({
      post_id: id,
      viewer_id: auth.user.id,
    });
  }

  return NextResponse.json({
    data: post,
    acknowledged: Boolean(acknowledgement),
    acknowledgedAt: acknowledgement?.acknowledged_at ?? null,
    featureEnabled: auth.featureEnabled,
    isAdmin: auth.isAdmin,
  });
}
