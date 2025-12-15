import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// DELETE /api/comments/:id (작성자 or admin)
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sb = admin();

  const { data: cmt, error: cmtErr } = await sb
    .from("comments")
    .select("id,author_id")
    .eq("id", id)
    .maybeSingle();

  if (cmtErr) return NextResponse.json({ error: cmtErr.message }, { status: 500 });
  if (!cmt) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "user";

  const canDelete = role === "admin" || cmt.author_id === user.id;
  if (!canDelete) return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });

  const { error: delErr } = await sb.from("comments").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
