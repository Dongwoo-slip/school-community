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
    .select("id,title,content,image_urls,author_id,created_at,updated_at,is_deleted")
    .eq("board", "ad")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "광고").trim().slice(0, 120) || "광고";
  const link = String(body?.link ?? "").trim().slice(0, 1000);
  const imageUrls = Array.isArray(body?.image_urls)
    ? body.image_urls.map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, 1)
    : [];

  if (!imageUrls.length) return NextResponse.json({ ok: false, error: "광고 이미지를 등록하세요." }, { status: 400 });
  if (link && !/^https?:\/\//.test(link)) return NextResponse.json({ ok: false, error: "링크는 https:// 또는 http://로 시작해야 합니다." }, { status: 400 });

  const sb = admin();
  const now = new Date().toISOString();
  await sb.from("posts").update({ is_deleted: true, updated_at: now }).eq("board", "ad").eq("is_deleted", false);

  const { data, error } = await sb
    .from("posts")
    .insert({
      board: "ad",
      title,
      content: link,
      image_urls: imageUrls,
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

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id가 필요합니다." }, { status: 400 });

  const { error } = await admin()
    .from("posts")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("board", "ad")
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
