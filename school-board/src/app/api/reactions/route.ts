import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

function usernameFromEmail(email: string | null | undefined) {
  if (!email) return null;
  const at = email.indexOf("@");
  return at >= 0 ? email.slice(0, at) : email;
}

async function safeActorUsername(sb: ReturnType<typeof admin>, userId: string, email?: string | null) {
  try {
    const { data } = await sb.from("profiles").select("username").eq("id", userId).maybeSingle();
    return data?.username ?? usernameFromEmail(email) ?? "unknown";
  } catch {
    return usernameFromEmail(email) ?? "unknown";
  }
}

async function getPostAuthorId(sb: ReturnType<typeof admin>, postId: string) {
  const { data } = await sb.from("posts").select("author_id").eq("id", postId).maybeSingle();
  return (data?.author_id as string | null) ?? null;
}

async function getAdminIds(sb: ReturnType<typeof admin>) {
  const { data } = await sb.from("profiles").select("id").eq("role", "admin");
  return (data ?? []).map((x: any) => String(x.id)).filter(Boolean);
}

async function getCounts(sb: ReturnType<typeof admin>, postId: string) {
  const { data: rows } = await sb.from("post_reactions").select("action").eq("post_id", postId);
  const counts = { like: 0, dislike: 0, report: 0 };
  (rows ?? []).forEach((r: any) => {
    if (r.action === "like") counts.like += 1;
    if (r.action === "dislike") counts.dislike += 1;
  });
  // ✅ 신고 카운트는 UI에 안 보여줄거라 0 고정
  counts.report = 0;
  return counts;
}

async function getMine(sb: ReturnType<typeof admin>, postId: string, userId: string) {
  let mine = { like: false, dislike: false, report: false };

  const { data: my } = await sb
    .from("post_reactions")
    .select("action")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  mine.like = my?.action === "like";
  mine.dislike = my?.action === "dislike";

  try {
    const { data: rep } = await sb
      .from("post_reports")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    mine.report = !!rep;
  } catch {
    mine.report = false;
  }

  return mine;
}

// GET /api/reactions?post_id=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = String(searchParams.get("post_id") ?? "").trim();
    if (!postId) return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });

    const authed = await createAuthedClient();
    const { data } = await authed.auth.getUser();
    const user = data.user;

    const sb = admin();
    const counts = await getCounts(sb, postId);
    const mine = user?.id ? await getMine(sb, postId, user.id) : { like: false, dislike: false, report: false };

    return NextResponse.json({ counts, mine });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

// POST /api/reactions  body: { post_id, action }
export async function POST(req: Request) {
  try {
    const authed = await createAuthedClient();
    const { data: authData } = await authed.auth.getUser();
    const user = authData.user;

    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

    const postId = String(body.post_id ?? "").trim();
    const action = String(body.action ?? "").trim() as "like" | "dislike" | "report";

    if (!postId) return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
    if (!["like", "dislike", "report"].includes(action)) {
      return NextResponse.json({ error: "action이 올바르지 않습니다." }, { status: 400 });
    }

    const sb = admin();
    const actorUsername = await safeActorUsername(sb, user.id, user.email);

    // ✅ 신고
    if (action === "report") {
      // 1회만
      let inserted = false;
      try {
        const { error } = await sb.from("post_reports").insert({ post_id: postId, user_id: user.id });
        if (!error) inserted = true;
        // 중복이면 inserted=false 유지
      } catch {
        // post_reports 없거나 오류면 inserted=false
      }

      // admin에게 알림(신고 성공했을 때만)
      if (inserted) {
        const adminIds = await getAdminIds(sb);
        if (adminIds.length > 0) {
          const payload = adminIds.map((adminId) => ({
            recipient_id: adminId,
            actor_id: user.id,
            actor_username: actorUsername,
            type: "report",
            post_id: postId,
            read: false,
          }));
          await sb.from("notifications").insert(payload); // type_check에 report가 없으면 여기서 에러 -> SQL A가 필수
        }
      }

      const counts = await getCounts(sb, postId);
      const mine = await getMine(sb, postId, user.id);

      return NextResponse.json({ counts, mine, toggled: inserted ? "on" : "off" });
    }

    // ✅ like/dislike 토글 (post_reactions: action은 like/dislike만 허용)
    const { data: existing } = await sb
      .from("post_reactions")
      .select("id,action")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    let toggled: "on" | "off" = "on";

    if (!existing) {
      const { error } = await sb.from("post_reactions").insert({
        post_id: postId,
        user_id: user.id,
        action,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      toggled = "on";
    } else {
      if (existing.action === action) {
        const { error } = await sb.from("post_reactions").delete().eq("id", existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        toggled = "off";
      } else {
        const { error } = await sb.from("post_reactions").update({ action }).eq("id", existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        toggled = "on";
      }
    }

    // ✅ 좋아요만 작성자에게 알림(싫어요는 알림 X)
    if (action === "like" && toggled === "on") {
      const authorId = await getPostAuthorId(sb, postId);
      if (authorId && authorId !== user.id) {
        await sb.from("notifications").insert({
          recipient_id: authorId,
          actor_id: user.id,
          actor_username: actorUsername,
          type: "like",
          post_id: postId,
          read: false,
        }); // type_check에 like 없으면 여기서 에러 -> SQL A 필수
      }
    }

    const counts = await getCounts(sb, postId);
    const mine = await getMine(sb, postId, user.id);

    return NextResponse.json({ counts, mine, toggled });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
