import { NextRequest, NextResponse } from "next/server";
import { adminClient, requireAdmin } from "@/lib/serverAuth";
import { awardPoints } from "@/lib/points";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CalendarContent = {
  dueDate?: string;
  type?: string;
  subject?: string;
  scope?: string;
  memo?: string;
  approvedAt?: string;
  approvedBy?: string;
  pointsAwarded?: number;
};

function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function parseContent(content: string | null): CalendarContent {
  try {
    const parsed = JSON.parse(String(content ?? "{}"));
    return parsed && typeof parsed === "object" ? parsed as CalendarContent : {};
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const id = cleanText(body?.id ?? body?.post_id, 80);
  const notificationId = cleanText(body?.notificationId ?? body?.notification_id, 80);

  if (!id) return NextResponse.json({ error: "승인할 일정을 찾지 못했습니다." }, { status: 400 });

  const sb = adminClient();
  const { data: row, error: readError } = await sb
    .from("posts")
    .select("id, title, content, author_id, board, is_deleted")
    .eq("id", id)
    .eq("board", "calendar")
    .maybeSingle();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!row || row.is_deleted) return NextResponse.json({ error: "일정을 찾지 못했습니다." }, { status: 404 });
  if (!row.author_id) return NextResponse.json({ error: "작성자를 찾지 못했습니다." }, { status: 400 });

  const content = parseContent(row.content);
  if (content.approvedAt) {
    return NextResponse.json({
      ok: true,
      awarded: false,
      alreadyApproved: true,
      points: Number(content.pointsAwarded) || 20,
    });
  }

  const approvedAt = new Date().toISOString();
  const nextContent: CalendarContent = {
    ...content,
    approvedAt,
    approvedBy: auth.user.id,
    pointsAwarded: 20,
  };

  const { error: updateError } = await sb
    .from("posts")
    .update({ content: JSON.stringify(nextContent), updated_at: approvedAt })
    .eq("id", id)
    .eq("board", "calendar");

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  try {
    await awardPoints({ id: row.author_id }, 20);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "포인트 지급 실패" },
      { status: 500 },
    );
  }

  if (notificationId) {
    await sb
      .from("notifications")
      .update({
        read: true,
        metadata: {
          action: "calendar_review",
          approvedAt,
          approvedBy: auth.user.id,
          pointsAwarded: 20,
        },
      })
      .eq("id", notificationId);
  }

  return NextResponse.json({ ok: true, awarded: true, points: 20 });
}
