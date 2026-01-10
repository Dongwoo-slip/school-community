import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
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
  if (!user) return { ok: false as const, status: 401 };

  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return { ok: false as const, status: 403 };

  return { ok: true as const, status: 200 };
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.status === 401 ? "unauthorized" : "forbidden" },
      { status: gate.status }
    );
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "80"), 200);
  const table = (url.searchParams.get("table") ?? "").trim(); // 예: posts / comments

  const sb = admin();

  let q = sb
    .from("deleted_content")
    .select("id, source_table, source_id, deleted_at, deleted_by, payload")
    .order("deleted_at", { ascending: false })
    .limit(limit);

  if (table) q = q.ilike("source_table", `%${table}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data: data ?? [] });
}
