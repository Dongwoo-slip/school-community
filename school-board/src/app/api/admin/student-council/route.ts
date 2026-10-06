import { NextResponse } from "next/server";
import { adminClient, requireAdmin } from "@/lib/serverAuth";
import {
  isStudentCouncilCategory,
  isStudentCouncilStatus,
  type StudentCouncilCategory,
  type StudentCouncilPost,
  type StudentCouncilStatus,
} from "@/lib/studentCouncil";
import {
  isStudentCouncilSchemaMissing,
  STUDENT_COUNCIL_POST_SELECT,
  STUDENT_COUNCIL_UNAVAILABLE_MESSAGE,
} from "@/lib/studentCouncilServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Payload = {
  category: StudentCouncilCategory;
  title: string;
  summary: string;
  body: string;
  target_audience: string;
  action_required: string | null;
  decision_reason: string | null;
  department: string | null;
  event_date: string | null;
  deadline: string | null;
  meeting_date: string | null;
  discussion_topics: string | null;
  opinions: string | null;
  decision: string | null;
  next_schedule: string | null;
  progress_stage: string | null;
  status: StudentCouncilStatus;
  is_pinned: boolean;
  is_published: boolean;
};

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

function parsePayload(body: Record<string, unknown>): { data?: Payload; error?: string } {
  const title = cleanText(body.title, 160);
  const summary = cleanText(body.summary, 500);
  const content = cleanText(body.body, 20000);
  const targetAudience = cleanText(body.targetAudience ?? body.target_audience, 120);

  if (!isStudentCouncilCategory(body.category)) return { error: "카테고리를 선택해 주세요." };
  if (!isStudentCouncilStatus(body.status)) return { error: "진행 상태를 선택해 주세요." };
  if (title.length < 2) return { error: "제목을 2글자 이상 입력해 주세요." };
  if (!summary && !content) return { error: "핵심 내용 또는 본문을 입력해 주세요." };
  if (!targetAudience) return { error: "공지 대상을 입력해 주세요." };

  return {
    data: {
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
      is_published: Boolean(body.isPublished ?? body.is_published),
    },
  };
}

function profileLabel(profile: Record<string, unknown> | undefined, userId: string) {
  const studentName = cleanText(profile?.student_name, 60);
  const username = cleanText(profile?.username, 60);
  const grade = Number(profile?.grade);
  const classNo = Number(profile?.class_no);
  const studentNo = cleanText(profile?.student_no, 20);
  const schoolLabel = [
    Number.isFinite(grade) && grade > 0 ? `${grade}학년` : "",
    Number.isFinite(classNo) && classNo > 0 ? `${classNo}반` : "",
    studentNo,
  ].filter(Boolean).join(" ");

  return {
    userId,
    displayName: studentName || username || "사용자",
    schoolLabel,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = adminClient();
  const [
    { data: posts, error: postsError },
    { data: acknowledgements, error: acknowledgementError },
    { data: views, error: viewsError },
    { count: eligibleUserCount, error: userCountError },
  ] = await Promise.all([
    sb
      .from("student_council_posts")
      .select(STUDENT_COUNCIL_POST_SELECT)
      .order("updated_at", { ascending: false })
      .limit(200),
    sb
      .from("student_council_acknowledgements")
      .select("id,post_id,user_id,acknowledged_at")
      .order("acknowledged_at", { ascending: false })
      .limit(10000),
    sb
      .from("student_council_post_views")
      .select("post_id")
      .limit(10000),
    sb.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const error = postsError ?? acknowledgementError ?? viewsError ?? userCountError;
  if (error) {
    if (isStudentCouncilSchemaMissing(error)) {
      console.warn("[admin/student-council] schema is not ready", { code: error.code });
      return NextResponse.json({ data: [], stats: [], available: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = Array.from(new Set((acknowledgements ?? []).map((row) => String(row.user_id))));
  const profileMap = new Map<string, Record<string, unknown>>();
  if (userIds.length) {
    const { data: profiles, error: profileError } = await sb
      .from("profiles")
      .select("id,username,student_name,grade,class_no,student_no")
      .in("id", userIds);

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    for (const profile of profiles ?? []) profileMap.set(String(profile.id), profile);
  }

  const viewCountMap = new Map<string, number>();
  for (const row of views ?? []) {
    const postId = String(row.post_id);
    viewCountMap.set(postId, (viewCountMap.get(postId) ?? 0) + 1);
  }

  const acknowledgementMap = new Map<string, Array<Record<string, unknown>>>();
  for (const row of acknowledgements ?? []) {
    const postId = String(row.post_id);
    const userId = String(row.user_id);
    const list = acknowledgementMap.get(postId) ?? [];
    list.push({
      id: row.id,
      acknowledgedAt: row.acknowledged_at,
      ...profileLabel(profileMap.get(userId), userId),
    });
    acknowledgementMap.set(postId, list);
  }

  const postRows = (posts ?? []) as unknown as StudentCouncilPost[];
  const totalUsers = eligibleUserCount ?? 0;
  const stats = postRows.map((post) => {
    const postId = String(post.id);
    const people = acknowledgementMap.get(postId) ?? [];
    return {
      postId,
      viewCount: viewCountMap.get(postId) ?? 0,
      acknowledgementCount: people.length,
      eligibleUserCount: totalUsers,
      acknowledgementRate: totalUsers > 0 ? Math.round((people.length / totalUsers) * 1000) / 10 : 0,
      acknowledgements: people,
    };
  });

  return NextResponse.json({ data: postRows, stats, available: true });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parsePayload(body);
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const now = new Date().toISOString();
  const payload = parsed.data;
  const { data, error } = await adminClient()
    .from("student_council_posts")
    .insert({
      ...payload,
      created_by: auth.user.id,
      updated_by: auth.user.id,
      published_at: payload.is_published ? now : null,
    })
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
