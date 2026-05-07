import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// GET /api/polls?post_id=...
// -> { counts: { [optionId]: number }, total: number, myVote: optionId|null }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const post_id = searchParams.get("post_id");

  if (!post_id) return NextResponse.json({ error: "missing post_id" }, { status: 400 });

  const sb = admin();

  const { data: votes, error } = await sb
    .from("poll_votes")
    .select("option_id,voter_id")
    .eq("post_id", post_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const v of votes ?? []) {
    const k = String((v as any).option_id);
    counts[k] = (counts[k] ?? 0) + 1;
  }

  const total = (votes ?? []).length;

  // 내 투표(로그인 되어 있으면)
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  let myVote: string | null = null;
  if (user) {
    const mine = (votes ?? []).find((v: any) => String(v.voter_id) === String(user.id));
    myVote = mine ? String(mine.option_id) : null;
  }

  return NextResponse.json({ counts, total, myVote });
}

// POST /api/polls  body: { post_id, option_id }
// -> 한 사람 1표(다시 누르면 변경되게 upsert)
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const post_id = String(body?.post_id ?? "").trim();
  const option_id = String(body?.option_id ?? "").trim();

  if (!post_id || !option_id) return NextResponse.json({ error: "missing post_id/option_id" }, { status: 400 });

  const sb = admin();

  const { error } = await sb
    .from("poll_votes")
    .upsert(
      { post_id, voter_id: user.id, option_id },
      { onConflict: "post_id,voter_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
