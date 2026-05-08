import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

async function requireAdmin() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false as const, status: 401, error: "로그인이 필요합니다.", userId: null };

  const sb = admin();
  const { data: profile, error } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error) return { ok: false as const, status: 500, error: error.message, userId: null };
  if ((profile as any)?.role !== "admin") return { ok: false as const, status: 403, error: "권한이 없습니다.", userId: null };

  return { ok: true as const, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const sb = admin();
  const { data, error } = await sb
    .from("posts")
    .select("id,title,content,image_urls,tags,author_id,created_at,updated_at,is_deleted")
    .eq("board", "popup")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((row: any) => row.author_id).filter(Boolean).map(String)));
  const profileMap = new Map<string, string | null>();
  if (ids.length) {
    const { data: profiles } = await sb.from("profiles").select("id,username").in("id", ids);
    (profiles ?? []).forEach((profile: any) => profileMap.set(String(profile.id), profile.username ?? null));
  }

  const out = rows
    .map((row: any) => ({
      ...row,
      author_username: row.author_id ? profileMap.get(String(row.author_id)) ?? null : null,
    }))
    .sort((a: any, b: any) => {
      if (a.is_deleted !== b.is_deleted) return a.is_deleted ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return NextResponse.json({ ok: true, data: out });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim().slice(0, 120);
  const content = String(body?.content ?? "").trim().slice(0, 2000);
  const layout = body?.layout === "split" ? "split" : "portrait";
  const imageUrls = Array.isArray(body?.image_urls)
    ? body.image_urls.map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, 3)
    : [];

  if (title.length < 1) return NextResponse.json({ ok: false, error: "제목을 입력하세요." }, { status: 400 });
  if (content.length < 1 && imageUrls.length === 0) {
    return NextResponse.json({ ok: false, error: "텍스트 또는 이미지를 하나 이상 입력하세요." }, { status: 400 });
  }

  const sb = admin();
  const now = new Date().toISOString();

  await sb.from("posts").update({ is_deleted: true, updated_at: now }).eq("board", "popup").eq("is_deleted", false);

  const { data, error } = await sb
    .from("posts")
    .insert({
      board: "popup",
      title,
      content,
      image_urls: imageUrls,
      tags: [`popup:layout:${layout}`],
      author_id: auth.userId,
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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id가 필요합니다." }, { status: 400 });

  const { error } = await admin()
    .from("posts")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("board", "popup")
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
