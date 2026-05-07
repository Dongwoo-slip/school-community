import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// POST /api/polls/vote  { post_id, option_id }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const post_id = String(body?.post_id ?? "").trim();
  const option_id = String(body?.option_id ?? "").trim();
  if (!post_id || !option_id) return NextResponse.json({ error: "post_id, option_id가 필요합니다." }, { status: 400 });

  // 옵션 유효성 체크(서버에서 poll 읽고 option_id 존재 확인)
  const sb = admin();
  const { data: post, error: pErr } = await sb.from("posts").select("poll").eq("id", post_id).maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const poll = post?.poll;
  const ok =
    poll &&
    Array.isArray(poll.options) &&
    poll.options.some((o: any) => String(o?.id) === option_id);

  if (!ok) return NextResponse.json({ error: "유효하지 않은 투표 항목입니다." }, { status: 400 });

  // ✅ 1인 1표: 기존표 삭제 후 다시 insert (표 변경 가능)
  await supabase.from("poll_votes").delete().eq("post_id", post_id).eq("voter_id", user.id);

  const { error: insErr } = await supabase.from("poll_votes").insert({
    post_id,
    option_id,
    voter_id: user.id,
  });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
