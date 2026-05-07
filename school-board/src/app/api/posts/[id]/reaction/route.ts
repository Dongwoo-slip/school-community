import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

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

type Kind = "like" | "dislike";

export async function GET(_req: Request, ctx: any) {
  const postId = await getParamId(ctx);
  if (!postId) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const sb = admin();

  const { data: post, error: pErr } = await sb
    .from("posts")
    .select("like_count,dislike_count,report_count")
    .eq("id", postId)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  let myReaction: Kind | null = null;
  let reported = false;

  if (user) {
    const { data: r } = await sb
      .from("post_reactions")
      .select("kind")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    myReaction = (r?.kind as Kind) ?? null;

    const { data: rep } = await sb
      .from("post_reports")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    reported = !!rep?.id;
  }

  return NextResponse.json({
    data: {
      like_count: post.like_count ?? 0,
      dislike_count: post.dislike_count ?? 0,
      report_count: post.report_count ?? 0,
      myReaction,
      reported,
    },
  });
}

export async function POST(req: Request, ctx: any) {
  const postId = await getParamId(ctx);
  if (!postId) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const kind = (body?.kind ?? "") as Kind;
  if (kind !== "like" && kind !== "dislike") {
    return NextResponse.json({ error: "kind는 like/dislike만 가능합니다." }, { status: 400 });
  }

  const sb = admin();

  // 현재 카운트 가져오기
  const { data: post, error: pErr } = await sb
    .from("posts")
    .select("like_count,dislike_count")
    .eq("id", postId)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  let like = post.like_count ?? 0;
  let dislike = post.dislike_count ?? 0;

  // 내 기존 반응
  const { data: existing, error: eErr } = await sb
    .from("post_reactions")
    .select("id,kind")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  let myReaction: Kind | null = null;

  if (!existing) {
    // 신규 반응
    const { error: insErr } = await sb.from("post_reactions").insert({
      post_id: postId,
      user_id: user.id,
      kind,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    if (kind === "like") like += 1;
    else dislike += 1;

    myReaction = kind;
  } else if (existing.kind === kind) {
    // 같은 버튼 다시 누르면 취소
    const { error: delErr } = await sb.from("post_reactions").delete().eq("id", existing.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (kind === "like") like = Math.max(0, like - 1);
    else dislike = Math.max(0, dislike - 1);

    myReaction = null;
  } else {
    // like <-> dislike 변경
    const { error: updErr } = await sb.from("post_reactions").update({ kind }).eq("id", existing.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    if (existing.kind === "like") like = Math.max(0, like - 1);
    if (existing.kind === "dislike") dislike = Math.max(0, dislike - 1);

    if (kind === "like") like += 1;
    if (kind === "dislike") dislike += 1;

    myReaction = kind;
  }

  // posts 카운트 반영
  const { error: uErr } = await sb.from("posts").update({ like_count: like, dislike_count: dislike }).eq("id", postId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ data: { like_count: like, dislike_count: dislike, myReaction } });
}
