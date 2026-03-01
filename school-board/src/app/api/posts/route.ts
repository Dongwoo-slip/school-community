import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// GET /api/posts?board=free
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const board = (searchParams.get("board") ?? "free").trim() || "free";

    const sb = admin();

    const { data: posts, error } = await sb
      .from("posts")
      .select("*, author:profiles(username, role, points)")
      .eq("board", board)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: posts ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

// POST /api/posts (로그인 필요)
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const board = String(body.board ?? "free").trim();
  const title = String(body.title ?? "").trim().slice(0, 200);
  const content = String(body.content ?? "").trim().slice(0, 5000);

  if (title.length < 1) return NextResponse.json({ error: "제목을 입력하세요" }, { status: 400 });
  if (content.length < 1) return NextResponse.json({ error: "본문을 입력하세요" }, { status: 400 });

  const image_urls = Array.isArray(body.image_urls)
    ? body.image_urls.map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, 10)
    : [];

  const sb = admin();

  // ✅ 도배 방지: 30초 이내 작성 여부 확인
  const { data: lastPost } = await sb
    .from("posts")
    .select("created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastPost) {
    const diff = Date.now() - new Date(lastPost.created_at).getTime();
    if (diff < 30000) {
      return NextResponse.json({ error: "너무 자주 글을 올릴 수 없습니다. 30초 후에 다시 시도하세요." }, { status: 429 });
    }
  }

  // ✅ 투표(옵션 텍스트만 받으면 서버에서 id 붙여 저장)
  let poll: any = null;
  if (body.poll) {
    const q = String(body.poll.question ?? "투표").trim().slice(0, 50);
    const opts = Array.isArray(body.poll.options) ? body.poll.options : [];
    const clean = opts.map((x: any) => String(x ?? "").trim()).filter(Boolean);

    if (clean.length < 2) return NextResponse.json({ error: "투표 항목은 최소 2개" }, { status: 400 });
    if (clean.length > 10) return NextResponse.json({ error: "투표 항목은 최대 10개" }, { status: 400 });

    poll = {
      question: q || "투표",
      options: clean.map((text: string) => ({ id: crypto.randomUUID(), text })),
    };
  }


  const { data, error } = await sb
    .from("posts")
    .insert({
      board,
      title,
      content,
      image_urls,
      poll,
      author_id: user.id,
      view_count: 0,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Failed to create post" }, { status: 500 });

  // ✅ 포인트 증정 (+10) 및 첫 게시물 배지 부여
  try {
    const { data: current } = await sb.from("profiles").select("points, badge").eq("id", user.id).maybeSingle();
    const nextPoints = (Number(current?.points) || 0) + 10;

    // 첫 게시물인지 확인
    const { count } = await sb.from("posts").select("*", { count: "exact", head: true }).eq("author_id", user.id);
    const badges = Array.isArray(current?.badge) ? [...current.badge] : [];
    if (count === 1 && !badges.includes("First Step")) {
      badges.push("First Step");
    }

    await sb.from("profiles").update({ points: nextPoints, badge: badges }).eq("id", user.id);
  } catch (e) {
    console.error("Failed to update points/badges:", e);
  }

  return NextResponse.json({ id: data.id });
}
