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
  const sb = await createAuthedClient();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false as const, status: 401, error: "로그인이 필요합니다." };

  const { data: prof, error } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (error) return { ok: false as const, status: 500, error: error.message };
  if ((prof as any)?.role !== "admin") return { ok: false as const, status: 403, error: "권한이 없습니다." };

  return { ok: true as const };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const sb = admin();

  const { data, error } = await sb
    .from("deleted_posts")
    .select("id, post_id, title, content, author_id, deleted_by, deleted_at")
    .order("deleted_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = data ?? [];

  // username 매핑 (author + deleted_by)
  const ids = Array.from(
    new Set(
      rows
        .flatMap((r: any) => [r.author_id, r.deleted_by])
        .filter(Boolean)
        .map(String)
    )
  );

  const map = new Map<string, string | null>();
  if (ids.length) {
    const { data: profs } = await sb.from("profiles").select("id, username").in("id", ids);
    (profs ?? []).forEach((p: any) => map.set(String(p.id), p.username ?? null));
  }

  const out = rows.map((r: any) => ({
    ...r,
    author_username: r.author_id ? map.get(String(r.author_id)) ?? null : null,
    deleted_by_username: r.deleted_by ? map.get(String(r.deleted_by)) ?? null : null,
  }));

  return NextResponse.json({ ok: true, data: out });
}
