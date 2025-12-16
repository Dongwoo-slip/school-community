import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// POST /api/polls  { post_id, option_id }
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const post_id = String(body?.post_id ?? "").trim();
  const option_id = String(body?.option_id ?? "").trim();
  if (!post_id) return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  if (!option_id) return NextResponse.json({ error: "option_id가 필요합니다." }, { status: 400 });

  const sb = admin();

  // 게시글의 poll 확인 + option_id 유효성 확인
  const { data: post, error: pErr } = await sb.from("posts").select("id,poll").eq("id", post_id).maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const poll = post.poll as any;
  const optionIds: string[] = Array.isArray(poll?.options) ? poll.options.map((o: any) => String(o?.id ?? "")) : [];
  if (optionIds.length < 2) return NextResponse.json({ error: "투표가 없는 글입니다." }, { status: 400 });
  if (!optionIds.includes(option_id)) return NextResponse.json({ error: "잘못된 투표 항목입니다." }, { status: 400 });

  // 이미 투표했는지(1인 1표)
  const { data: existed, error: eErr } = await sb
    .from("poll_votes")
    .select("id")
    .eq("post_id", post_id)
    .eq("voter_id", user.id)
    .maybeSingle();

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
  if (existed) return NextResponse.json({ error: "이미 투표했습니다." }, { status: 409 });

  // 투표 등록
  const { error: iErr } = await sb.from("poll_votes").insert({
    post_id,
    option_id,
    voter_id: user.id,
  });

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
