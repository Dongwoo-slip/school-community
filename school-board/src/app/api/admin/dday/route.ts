import { NextResponse } from "next/server";
import { adminClient, requireAdmin } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { data, error } = await adminClient()
    .from("posts")
    .select("id,title,content,author_id,created_at,updated_at,is_deleted")
    .eq("board", "dday")
    .order("is_deleted", { ascending: true })
    .order("content", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const eventName = String(body?.eventName ?? "").trim().slice(0, 40);
  const targetDate = String(body?.targetDate ?? "").trim();

  if (eventName.length < 1) return NextResponse.json({ ok: false, error: "행사 이름을 입력하세요." }, { status: 400 });
  if (!isValidDate(targetDate)) return NextResponse.json({ ok: false, error: "날짜를 올바르게 입력하세요." }, { status: 400 });

  const sb = adminClient();
  const { data, error } = await sb
    .from("posts")
    .insert({
      board: "dday",
      title: eventName,
      content: targetDate,
      author_id: auth.user.id,
      view_count: 0,
      is_deleted: false,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id가 필요합니다." }, { status: 400 });

  const { error } = await adminClient()
    .from("posts")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("board", "dday")
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
