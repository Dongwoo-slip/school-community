import { NextResponse } from "next/server";
import { adminClient, requireAdmin } from "@/lib/serverAuth";
import {
  isStudentCouncilCategory,
  isStudentCouncilStatus,
} from "@/lib/studentCouncil";
import {
  isStudentCouncilSchemaMissing,
  STUDENT_COUNCIL_POST_SELECT,
  STUDENT_COUNCIL_UNAVAILABLE_MESSAGE,
} from "@/lib/studentCouncilServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function optionalText(value: unknown, max: number) {
  return cleanText(value, max) || null;
}

function optionalDate(value: unknown) {
  const text = cleanText(value, 40);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = cleanText(body.title, 160);
  const summary = cleanText(body.summary, 500);
  const content = cleanText(body.body, 20000);
  const targetAudience = cleanText(body.targetAudience ?? body.target_audience, 120);

  if (!isStudentCouncilCategory(body.category)) {
    return NextResponse.json({ error: "카테고리를 선택해 주세요." }, { status: 400 });
  }
  if (!isStudentCouncilStatus(body.status)) {
    return NextResponse.json({ error: "진행 상태를 선택해 주세요." }, { status: 400 });
  }
  if (title.length < 2) return NextResponse.json({ error: "제목을 2글자 이상 입력해 주세요." }, { status: 400 });
  if (!summary && !content) {
    return NextResponse.json({ error: "핵심 내용 또는 본문을 입력해 주세요." }, { status: 400 });
  }
  if (!targetAudience) return NextResponse.json({ error: "공지 대상을 입력해 주세요." }, { status: 400 });

  const sb = adminClient();
  const { data: existing, error: readError } = await sb
    .from("student_council_posts")
    .select("id,published_at")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    if (isStudentCouncilSchemaMissing(readError)) {
      return NextResponse.json({ error: STUDENT_COUNCIL_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  const isPublished = Boolean(body.isPublished ?? body.is_published);
  const { data, error } = await sb
    .from("student_council_posts")
    .update({
      category: body.category,
      title,
      summary,
      body: content,
      target_audience: targetAudience,
      action_required: optionalText(body.actionRequired ?? body.action_required, 2000),
      decision_reason: optionalText(body.decisionReason ?? body.decision_reason, 5000),
      department: optionalText(body.department, 120),
      event_date: optionalDate(body.eventDate ?? body.event_date),
      deadline: optionalDate(body.deadline),
      meeting_date: optionalDate(body.meetingDate ?? body.meeting_date),
      discussion_topics: optionalText(body.discussionTopics ?? body.discussion_topics, 5000),
      opinions: optionalText(body.opinions, 5000),
      decision: optionalText(body.decision, 5000),
      next_schedule: optionalText(body.nextSchedule ?? body.next_schedule, 2000),
      progress_stage: optionalText(body.progressStage ?? body.progress_stage, 80),
      status: body.status,
      is_pinned: Boolean(body.isPinned ?? body.is_pinned),
      is_published: isPublished,
      published_at: isPublished ? existing.published_at ?? new Date().toISOString() : null,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(STUDENT_COUNCIL_POST_SELECT)
    .single();

  if (error) {
    if (isStudentCouncilSchemaMissing(error)) {
      return NextResponse.json({ error: STUDENT_COUNCIL_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const { error } = await adminClient()
    .from("student_council_posts")
    .delete()
    .eq("id", id);

  if (error) {
    if (isStudentCouncilSchemaMissing(error)) {
      return NextResponse.json({ error: STUDENT_COUNCIL_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
