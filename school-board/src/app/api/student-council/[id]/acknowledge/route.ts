import { NextResponse } from "next/server";
import { adminClient } from "@/lib/serverAuth";
import {
  isStudentCouncilSchemaMissing,
  requireStudentCouncilAccess,
  STUDENT_COUNCIL_UNAVAILABLE_MESSAGE,
} from "@/lib/studentCouncilServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireStudentCouncilAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const sb = adminClient();
  const { data: post, error: postError } = await sb
    .from("student_council_posts")
    .select("id")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (postError) {
    if (isStudentCouncilSchemaMissing(postError)) {
      return NextResponse.json({ error: STUDENT_COUNCIL_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  const { data, error } = await sb
    .from("student_council_acknowledgements")
    .upsert(
      {
        post_id: id,
        user_id: auth.user.id,
      },
      {
        onConflict: "post_id,user_id",
        ignoreDuplicates: true,
      },
    )
    .select("acknowledged_at")
    .maybeSingle();

  if (error) {
    if (isStudentCouncilSchemaMissing(error)) {
      return NextResponse.json({ error: STUDENT_COUNCIL_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.acknowledged_at) {
    return NextResponse.json({ acknowledged: true, acknowledgedAt: data.acknowledged_at });
  }

  const { data: existing, error: readError } = await sb
    .from("student_council_acknowledgements")
    .select("acknowledged_at")
    .eq("post_id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (readError) {
    if (isStudentCouncilSchemaMissing(readError)) {
      return NextResponse.json({ error: STUDENT_COUNCIL_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  return NextResponse.json({ acknowledged: true, acknowledgedAt: existing?.acknowledged_at ?? null });
}
