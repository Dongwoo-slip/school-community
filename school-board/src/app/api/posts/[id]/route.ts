import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

type Params = { id: string };

// GET /api/posts/:id
export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { id } = await ctx.params;

  const sb = admin();
  const { data, error } = await sb
    .from("posts")
    .select("id,board,title,content,created_at,view_count,author_id")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

  await sb.from("posts").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", id);

  let author = { username: null as string | null, role: "user" as string };
  if (data.author_id) {
    const { data: pr } = await sb
      .from("profiles")
      .select("username,role")
      .eq("id", data.author_id)
      .maybeSingle();

    author = { username: pr?.username ?? null, role: pr?.role ?? "user" };
  }

  return NextResponse.json({ data: { ...data, author } });
}

// DELETE /api/posts/:id (작성자 or admin)
export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  const { id } = await ctx.params;

  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sb = admin();

  const { data: post, error: postErr } = await sb
    .from("posts")
    .select("author_id")
    .eq("id", id)
    .single();

  if (postErr || !post) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

  let isAdmin = false;
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  isAdmin = profile?.role === "admin";

  const isOwner = !!post.author_id && post.author_id === user.id;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });

  const { error: delErr } = await sb.from("posts").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
