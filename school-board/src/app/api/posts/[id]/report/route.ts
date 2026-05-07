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

export async function POST(req: Request, ctx: any) {
  const postId = await getParamId(ctx);
  if (!postId) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reason = String(body?.reason ?? "").trim().slice(0, 300) || null;

  const sb = admin();

  // 이미 신고했는지
  const { data: exists, error: exErr } = await sb
    .from("post_reports")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (exists?.id) {
    // 이미 신고했으면 카운트는 그대로
    const { data: post } = await sb.from("posts").select("report_count").eq("id", postId).maybeSingle();
    return NextResponse.json({ data: { reported: true, report_count: post?.report_count ?? 0 } });
  }

  // posts 카운트 가져오기
  const { data: post, error: pErr } = await sb.from("posts").select("report_count").eq("id", postId).maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });

  const nextReport = (post.report_count ?? 0) + 1;

  // 신고 insert
  const { error: insErr } = await sb.from("post_reports").insert({
    post_id: postId,
    user_id: user.id,
    reason,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // 카운트 업데이트
  const { error: uErr } = await sb.from("posts").update({ report_count: nextReport }).eq("id", postId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ data: { reported: true, report_count: nextReport } });
}
