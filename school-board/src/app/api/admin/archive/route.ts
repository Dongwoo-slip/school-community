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
  const { data: prof, error } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error) return { ok: false as const, status: 500, error: error.message, userId: null };
  if ((prof as any)?.role !== "admin") return { ok: false as const, status: 403, error: "권한이 없습니다.", userId: null };

  return { ok: true as const, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const sb = admin();
  const { data, error } = await sb
    .from("posts")
    .select("id, board, title, content, author_id, created_at, updated_at, view_count, like_count, is_deleted")
    .eq("is_deleted", true)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r: any) => r.author_id).filter(Boolean).map(String)));
  const profileMap = new Map<string, string | null>();
  if (ids.length) {
    const { data: profiles } = await sb.from("profiles").select("id, username").in("id", ids);
    (profiles ?? []).forEach((p: any) => profileMap.set(String(p.id), p.username ?? null));
  }

  return NextResponse.json({
    ok: true,
    data: rows.map((r: any) => ({
      ...r,
      author_username: r.author_id ? profileMap.get(String(r.author_id)) ?? null : null,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const board = String(body?.board ?? "free").trim() || "free";
  const id = String(body?.id ?? "").trim();

  const sb = admin();
  let query = sb
    .from("posts")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("is_deleted", false);

  query = id ? query.eq("id", id) : query.eq("board", board);

  const { data, error } = await query.select("id");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, archived: data?.length ?? 0 });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const restoreAll = body?.restoreAll === true;
  const id = String(body?.id ?? "").trim();

  const sb = admin();
  let query = sb
    .from("posts")
    .update({ is_deleted: false, updated_at: new Date().toISOString() })
    .eq("is_deleted", true);

  if (!restoreAll) {
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    query = query.eq("id", id);
  }

  const { data, error } = await query.select("id");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, restored: data?.length ?? 0 });
}
