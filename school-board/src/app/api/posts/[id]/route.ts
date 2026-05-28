import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AUTHOR_PROFILE_SELECT } from "@/lib/authorDisplay";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

const EDIT_LOG_PREFIX = "[수정 로그]";

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

// GET /api/posts/:id  (로그인한 사용자만 상세 조회)
export async function GET(_req: Request, ctx: any) {
  const id = await getParamId(ctx);
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sb = admin();
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "user";

  const { data: post, error } = await sb
    .from("posts")
    .select(`*, author:profiles(${AUTHOR_PROFILE_SELECT})`)
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  if (post.is_deleted) {
    if (role !== "admin") {
      return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }
  }

  // 조회수 +1 (비동기로 실행하여 응답 속도에 영향을 주지 않음)
  const nextView = post.is_deleted ? (post.view_count ?? 0) : (post.view_count ?? 0) + 1;
  if (!post.is_deleted) {
    sb.from("posts").update({ view_count: nextView }).eq("id", id).then(() => { });
  }

  return NextResponse.json({
    data: {
      ...post,
      view_count: nextView,
      like_count: post.like_count ?? 0,
      dislike_count: post.dislike_count ?? 0,
      report_count: post.report_count ?? 0,
    },
  });
}

// PATCH /api/posts/:id (작성자 or admin 수정 + 관리자 감사 로그)
export async function PATCH(req: Request, ctx: any) {
  const id = await getParamId(ctx);
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim().slice(0, 120);
  const content = String(body?.content ?? "").trim().slice(0, 5000);

  if (title.length < 2) return NextResponse.json({ error: "제목은 2글자 이상 입력하세요." }, { status: 400 });
  if (content.length < 2) return NextResponse.json({ error: "본문은 2글자 이상 입력하세요." }, { status: 400 });

  const sb = admin();
  const { data: post, error: postErr } = await sb
    .from("posts")
    .select("id,title,content,author_id,is_deleted")
    .eq("id", id)
    .maybeSingle();

  if (postErr) return NextResponse.json({ error: postErr.message }, { status: 500 });
  if (!post || post.is_deleted) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "user";
  const canEdit = role === "admin" || String(post.author_id) === String(user.id);
  if (!canEdit) return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });

  const oldTitle = String(post.title ?? "");
  const oldContent = String(post.content ?? "");
  const changedTitle = oldTitle !== title;
  const changedContent = oldContent !== content;

  if (!changedTitle && !changedContent) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const now = new Date().toISOString();
  const logTitle = `${EDIT_LOG_PREFIX} ${oldTitle || "(제목 없음)"} -> ${title || "(제목 없음)"}`.slice(0, 500);
  const logContent = [
    "제목 변경",
    `BEFORE: ${oldTitle || "(제목 없음)"}`,
    `AFTER: ${title || "(제목 없음)"}`,
    "",
    "본문 변경",
    "----- BEFORE -----",
    oldContent,
    "----- AFTER -----",
    content,
  ].join("\n");

  const { error: logErr } = await sb.from("deleted_posts").insert({
    post_id: id,
    title: logTitle,
    content: logContent,
    author_id: post.author_id,
    deleted_by: user.id,
    deleted_at: now,
  });

  if (logErr) return NextResponse.json({ error: `수정 로그 저장 실패: ${logErr.message}` }, { status: 500 });

  const { error: updateErr } = await sb
    .from("posts")
    .update({ title, content, updated_at: now })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
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
