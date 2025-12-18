import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// ✅ Next 버전/환경에 따라 params가 Promise로 오는 경우가 있어서 안전 처리
async function getParamId(ctx: any): Promise<string | null> {
  try {
    const p = ctx?.params;
    if (!p) return null;

    if (typeof p?.then === "function") {
      const awaited = await p;
      const id = awaited?.id;
      return typeof id === "string" && id.length > 0 ? id : null;
    }

    const id = p?.id;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

// GET /api/posts/:id  (공개 상세 조회)
export async function GET(_req: Request, ctx: any) {
  const id = await getParamId(ctx);
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const sb = admin();

  const { data: post, error } = await sb
    .from("posts")
    .select("id,title,content,created_at,view_count,author_id,image_urls,poll,like_count,dislike_count,report_count")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  // 조회수 +1
  const nextView = (post.view_count ?? 0) + 1;
  await sb.from("posts").update({ view_count: nextView }).eq("id", id);

  // 작성자 프로필
  let author: { username: string | null; role: string | null } | null = null;
  if (post.author_id) {
    const { data: profile } = await sb
      .from("profiles")
      .select("username,role")
      .eq("id", post.author_id)
      .maybeSingle();
    if (profile) author = profile;
  }

  return NextResponse.json({
    data: {
      ...post,
      view_count: nextView,
      author,
      like_count: post.like_count ?? 0,
      dislike_count: post.dislike_count ?? 0,
      report_count: post.report_count ?? 0,
    },
  });
}

// DELETE /api/posts/:id (로그인 + 권한: 작성자 or admin)
export async function DELETE(_req: Request, ctx: any) {
  const id = await getParamId(ctx);
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sb = admin();

  const { data: post, error: postErr } = await sb
    .from("posts")
    .select("id,author_id")
    .eq("id", id)
    .maybeSingle();

  if (postErr) return NextResponse.json({ error: postErr.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "user";

  const canDelete = role === "admin" || String(post.author_id) === String(user.id);
  if (!canDelete) return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });

  const { error: delErr } = await sb.from("posts").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
