import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { awardPoints } from "@/lib/points";
import { AUTHOR_PROFILE_SELECT } from "@/lib/authorDisplay";
import { requireStudentVerifiedWriter } from "@/lib/studentVerification";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

const COMMENT_RATE_LIMIT_MESSAGE = "1분당 댓글은 최대 2개까지 가능합니다.";

type CommentInsertRow = {
  post_id: string;
  content: string;
  author_id: string;
  parent_id?: string;
};

// GET /api/comments?post_id=...
export async function GET(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다.", data: [] }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const post_id = searchParams.get("post_id");

  if (!post_id) {
    return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  }

  const sb = admin();

  const { data: comments, error } = await sb
    .from("comments")
    .select(`*, author:profiles(${AUTHOR_PROFILE_SELECT})`)
    .eq("post_id", post_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: comments ?? [] });
}

// POST /api/comments  (로그인 필요)
// body: { post_id, content, parent_id? }
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const post_id = String(body.post_id ?? "").trim();
  const content = String(body.content ?? "").trim().slice(0, 1000);
  const parent_id_raw = body.parent_id ?? null;
  const parent_id = parent_id_raw ? String(parent_id_raw).trim() : null;

  if (!post_id) return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  if (content.length < 1) return NextResponse.json({ error: "댓글을 입력해주세요." }, { status: 400 });

  const sb = admin();
  const verification = await requireStudentVerifiedWriter(sb, user.id);
  if (!verification.ok) {
    return NextResponse.json(
      { error: verification.error, code: "STUDENT_VERIFICATION_REQUIRED" },
      { status: verification.status }
    );
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const [{ count: recentCommentsCount, error: recentCommentsErr }, { count: recentDeletedCommentsCount, error: recentDeletedCommentsErr }] =
    await Promise.all([
      sb
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("author_id", user.id)
        .gte("created_at", oneMinuteAgo),
      sb
        .from("deleted_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", user.id)
        .like("title", "[댓글 삭제]%")
        .gte("deleted_at", oneMinuteAgo),
    ]);

  if (recentCommentsErr) return NextResponse.json({ error: recentCommentsErr.message }, { status: 500 });
  if (recentDeletedCommentsErr) return NextResponse.json({ error: recentDeletedCommentsErr.message }, { status: 500 });

  if ((recentCommentsCount ?? 0) + (recentDeletedCommentsCount ?? 0) >= 2) {
    return NextResponse.json({ error: COMMENT_RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  // ✅ 도배 방지: 10초 이내 작성 여부 확인
  const { data: lastComment } = await sb
    .from("comments")
    .select("created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastComment) {
    const diff = Date.now() - new Date(lastComment.created_at).getTime();
    if (diff < 10000) {
      return NextResponse.json({ error: "너무 자주 댓글을 달 수 없습니다. 10초 후에 다시 시도하세요." }, { status: 429 });
    }
  }

  // parent_id가 있으면 같은 post의 댓글인지 최소 검증
  if (parent_id) {
    const { data: parent, error: parentErr } = await sb
      .from("comments")
      .select("id,post_id")
      .eq("id", parent_id)
      .maybeSingle();

    if (parentErr) return NextResponse.json({ error: parentErr.message }, { status: 500 });
    if (!parent) return NextResponse.json({ error: "부모 댓글을 찾을 수 없습니다." }, { status: 400 });
    if (String(parent.post_id) !== String(post_id)) {
      return NextResponse.json({ error: "부모 댓글이 다른 게시글에 속해 있습니다." }, { status: 400 });
    }
  }

  const insertRow: CommentInsertRow = { post_id, content, author_id: user.id };
  if (parent_id) insertRow.parent_id = parent_id;

  const { data, error } = await sb.from("comments").insert(insertRow).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ✅ 포인트 증정 (+5)
  try {
    await awardPoints(user, 5);
  } catch (e) {
    console.error("Failed to update points:", e);
  }

  return NextResponse.json({ id: data.id });
}
