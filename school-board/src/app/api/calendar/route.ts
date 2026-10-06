import { NextRequest, NextResponse } from "next/server";
import { adminClient, requireUser } from "@/lib/serverAuth";
import { AUTHOR_PROFILE_SELECT } from "@/lib/authorDisplay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPES = ["시험", "과제", "수행평가", "동아리", "기타"] as const;
type CalendarType = (typeof TYPES)[number];

type CalendarPayload = {
  dueDate: string;
  type: CalendarType;
  subject: string;
  scope: string;
  memo: string;
  approvedAt?: string;
  approvedBy?: string;
  pointsAwarded?: number;
};

type CalendarProfile = {
  role?: string | null;
  student_verified?: boolean | null;
  student_no?: string | null;
  student_name?: string | null;
};

type CalendarDbRow = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  author_id: string | null;
  author?: unknown;
};

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function isCalendarType(value: unknown): value is CalendarType {
  return typeof value === "string" && (TYPES as readonly string[]).includes(value);
}

function parsePayload(content: string | null): CalendarPayload | null {
  try {
    const parsed = JSON.parse(String(content ?? "{}")) as Record<string, unknown>;
    const dueDate = cleanText(parsed?.dueDate, 10);
    if (!isDateString(dueDate)) return null;

    return {
      dueDate,
      type: isCalendarType(parsed?.type) ? parsed.type : "기타",
      subject: cleanText(parsed?.subject, 80),
      scope: cleanText(parsed?.scope, 80),
      memo: cleanText(parsed?.memo, 500),
      approvedAt: cleanText(parsed?.approvedAt, 40) || undefined,
      approvedBy: cleanText(parsed?.approvedBy, 80) || undefined,
      pointsAwarded: Number(parsed?.pointsAwarded) || undefined,
    };
  } catch {
    return null;
  }
}

function canWrite(profile: CalendarProfile | null) {
  return Boolean(profile?.role === "admin" || profile?.student_verified || profile?.student_no || profile?.student_name);
}

function normalizeRow(row: CalendarDbRow) {
  const payload = parsePayload(row?.content);
  if (!payload) return null;

  return {
    id: row.id,
    title: row.title ?? "",
    created_at: row.created_at,
    author_id: row.author_id,
    author: row.author ?? null,
    ...payload,
  };
}

async function notifyAdmins(params: {
  calendarId: string;
  title: string;
  actorId: string;
  actorUsername: string | null;
}) {
  const sb = adminClient();
  const { data: admins, error } = await sb
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(20);

  if (error || !Array.isArray(admins) || admins.length === 0) return;

  const rows = admins
    .map((admin) => String(admin?.id ?? "").trim())
    .filter(Boolean)
    .filter((adminId) => adminId !== params.actorId)
    .map((adminId) => ({
      type: "dm",
      recipient_id: adminId,
      actor_id: params.actorId,
      actor_username: params.actorUsername ?? "unknown",
      post_id: params.calendarId,
      board: "calendar",
      post_title: params.title,
      read: false,
      metadata: {
        action: "calendar_review",
        points: 20,
      },
    }));

  if (rows.length === 0) return;

  const { error: insertError } = await sb.from("notifications").insert(rows);
  if (!insertError) return;

  const fallbackRows = rows.map((row) => ({
    type: row.type,
    recipient_id: row.recipient_id,
    actor_id: row.actor_id,
    actor_username: row.actor_username,
    post_id: row.post_id,
    board: row.board,
    post_title: row.post_title,
    read: row.read,
  }));
  await sb.from("notifications").insert(fallbackRows);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const start = cleanText(url.searchParams.get("start"), 10);
  const end = cleanText(url.searchParams.get("end"), 10);

  const sb = adminClient();
  const { data, error } = await sb
    .from("posts")
    .select(`id,title,content,created_at,author_id,author:profiles(${AUTHOR_PROFILE_SELECT})`)
    .eq("board", "calendar")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let items = (data ?? []).map(normalizeRow).filter(Boolean) as ReturnType<typeof normalizeRow>[];
  if (isDateString(start)) items = items.filter((item) => item && item.dueDate >= start);
  if (isDateString(end)) items = items.filter((item) => item && item.dueDate <= end);

  items.sort((a, b) => {
    if (!a || !b) return 0;
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return NextResponse.json({ data: items });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canWrite(auth.profile)) {
    return NextResponse.json(
      { error: "개별인증이 필요합니다. 마이페이지에서 인증코드를 등록한 뒤 일정을 등록해 주세요." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const title = cleanText(body?.title, 120);
  const dueDate = cleanText(body?.dueDate, 10);
  const type = isCalendarType(body?.type) ? body.type : "기타";
  const subject = cleanText(body?.subject, 80);
  const scope = cleanText(body?.scope, 80);
  const memo = cleanText(body?.memo, 500);

  if (title.length < 2) return NextResponse.json({ error: "일정 제목을 2글자 이상 입력해 주세요." }, { status: 400 });
  if (!isDateString(dueDate)) return NextResponse.json({ error: "마감 날짜를 선택해 주세요." }, { status: 400 });

  const payload: CalendarPayload = {
    dueDate,
    type,
    subject,
    scope,
    memo,
  };

  const { data, error } = await adminClient()
    .from("posts")
    .insert({
      board: "calendar",
      title,
      content: JSON.stringify(payload),
      tags: [type, scope || "전체"].filter(Boolean).slice(0, 4),
      author_id: auth.user.id,
      view_count: 0,
    })
    .select(`id,title,content,created_at,author_id,author:profiles(${AUTHOR_PROFILE_SELECT})`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.id) {
    await notifyAdmins({
      calendarId: data.id,
      title,
      actorId: auth.user.id,
      actorUsername: typeof auth.profile?.username === "string" ? auth.profile.username : null,
    });
  }

  return NextResponse.json({ data: normalizeRow(data) });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const id = cleanText(url.searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ error: "삭제할 일정을 찾지 못했습니다." }, { status: 400 });

  const sb = adminClient();
  const { data: row, error: readError } = await sb
    .from("posts")
    .select("id,author_id")
    .eq("id", id)
    .eq("board", "calendar")
    .maybeSingle();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "일정이 없습니다." }, { status: 404 });
  if ((auth.profile as CalendarProfile | null)?.role !== "admin" && String(row.author_id) !== String(auth.user.id)) {
    return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
  }

  const { error } = await sb
    .from("posts")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("board", "calendar");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
