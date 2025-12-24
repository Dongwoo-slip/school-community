import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

function cleanUsername(v: string) {
  return (v ?? "").trim();
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * 이 프로젝트는 인증/role 판단을 /api/me에서 이미 잘 하고 있으니,
 * 여기서는 쿠키 그대로 넘겨서 /api/me 결과를 신뢰하고 사용.
 */
async function getMeFromApi(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const cookie = req.headers.get("cookie") ?? "";

  const res = await fetch(`${origin}/api/me`, {
    cache: "no-store",
    headers: { cookie },
  });

  const json = await res.json().catch(() => ({}));
  return {
    userId: json?.userId ?? null,
    role: json?.role ?? "guest",
    username: json?.username ?? null,
  };
}

async function resolveReceiverIdByUsername(usernameRaw: string) {
  const supa = adminClient();
  const username = cleanUsername(usernameRaw);
  if (!username) return { receiverId: null as string | null, foundName: null as string | null, err: "username이 비었습니다." };

  // ✅ ilike는 패턴이므로 정확히 찾고 싶으면 eq가 더 좋음(대소문자까지 완전 일치)
  // 일단 너 요구대로 "username 그대로" 찾기: eq 먼저
  {
    const { data, error } = await supa.from("profiles").select("id, username").eq("username", username).limit(5);
    if (!error && Array.isArray(data) && data.length === 1) {
      return { receiverId: data[0].id as string, foundName: (data[0].username as string) ?? null, err: null as string | null };
    }
    if (!error && Array.isArray(data) && data.length > 1) {
      return { receiverId: null, foundName: null, err: `username '${username}' 이(가) 여러 명입니다. (중복 username)` };
    }
  }

  // 대소문자/공백 문제 대응: ilike(정확히)
  {
    const { data, error } = await supa.from("profiles").select("id, username").ilike("username", username).limit(5);
    if (!error && Array.isArray(data) && data.length === 1) {
      return { receiverId: data[0].id as string, foundName: (data[0].username as string) ?? null, err: null as string | null };
    }
    if (!error && Array.isArray(data) && data.length > 1) {
      return { receiverId: null, foundName: null, err: `username '${username}' 이(가) 여러 명입니다. (중복 username)` };
    }
  }

  return { receiverId: null, foundName: null, err: `username '${username}' 사용자를 찾지 못했습니다.` };
}

async function resolveReceiverIdByPostId(postIdRaw: string) {
  const supa = adminClient();
  const postId = (postIdRaw ?? "").trim();
  if (!postId) return { receiverId: null as string | null, err: "post가 비었습니다." };

  const { data, error } = await supa.from("posts").select("id, author_id").eq("id", postId).maybeSingle();
  if (error) return { receiverId: null, err: error.message };

  const receiverId = (data as any)?.author_id ?? null;
  if (!receiverId) return { receiverId: null, err: "⚠ 이 게시글의 작성자(author_id)를 찾지 못했습니다." };

  return { receiverId, err: null };
}

async function insertMessageFlexible(payload: any) {
  const supa = adminClient();

  // ✅ 혹시 남아있으면 제거(메시지 테이블에 post_id 없음)
  delete payload.post_id;

  // 1) receiver_id로 시도
  {
    const { data, error } = await supa.from("messages").insert(payload).select("id").maybeSingle();
    if (!error) return { ok: true, id: (data as any)?.id ?? null, used: "receiver_id" as const };

    // recipient_id만 있는 경우 대비
    if (String(error.message || "").toLowerCase().includes("receiver_id")) {
      // fallthrough
    } else {
      return { ok: false, error: error.message };
    }
  }

  // 2) recipient_id로 재시도
  const { receiver_id, ...rest } = payload;
  const payload2 = { ...rest, recipient_id: receiver_id };

  const { data: data2, error: error2 } = await supa.from("messages").insert(payload2).select("id").maybeSingle();
  if (error2) return { ok: false, error: error2.message };

  return { ok: true, id: (data2 as any)?.id ?? null, used: "recipient_id" as const };
}

async function insertDmNotification(receiverId: string, actorUsername: string | null) {
  const supa = adminClient();

  // ✅ 여기서 .catch() 쓰면 안 됨(쿼리빌더엔 catch 없음)
  // ✅ 알림 insert 실패해도 DM은 성공 유지: try/catch로 조용히 무시
  try {
    const payload: any = {
      type: "dm",
      recipient_id: receiverId,
      actor_username: actorUsername ?? "admin",
      read: false,
    };

    // notifications에 post_id 컬럼이 있는 프로젝트도 있어서 "있으면 넣고" 없으면 에러 무시
    payload.post_id = null;

    const { error } = await supa.from("notifications").insert(payload);
    if (!error) return;

    // post_id 컬럼 없어서 실패한 경우 -> post_id 빼고 재시도
    if (String(error.message || "").toLowerCase().includes("post_id")) {
      delete payload.post_id;
      await supa.from("notifications").insert(payload);
    }
  } catch {
    // 알림은 best-effort
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getMeFromApi(req);
    if (!me.userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (me.role !== "admin") return NextResponse.json({ error: "관리자만 DM을 보낼 수 있습니다." }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    const content = String(body?.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "content가 비었습니다." }, { status: 400 });

    // 지원 파라미터:
    // - receiver_id / recipient_id : uuid
    // - to / username : username 문자열
    // - post / post_id : 게시글 id로 author_id 찾기
    const receiverIdRaw = String(body?.receiver_id ?? body?.recipient_id ?? "").trim() || "";
    const usernameRaw = String(body?.to ?? body?.username ?? "").trim() || "";
    const postRaw = String(body?.post ?? body?.post_id ?? "").trim() || "";

    let receiverId: string | null = null;
    let resolvedName: string | null = null;

    if (receiverIdRaw) {
      if (!isUuid(receiverIdRaw)) {
        return NextResponse.json({ error: "receiver_id/recipient_id는 uuid 형태여야 합니다." }, { status: 400 });
      }
      receiverId = receiverIdRaw;
    } else if (postRaw) {
      const r = await resolveReceiverIdByPostId(postRaw);
      if (!r.receiverId) return NextResponse.json({ error: r.err ?? "작성자 찾기 실패" }, { status: 400 });
      receiverId = r.receiverId;
    } else if (usernameRaw) {
      const r = await resolveReceiverIdByUsername(usernameRaw);
      if (!r.receiverId) return NextResponse.json({ error: r.err ?? "username 조회 실패" }, { status: 404 });
      receiverId = r.receiverId;
      resolvedName = r.foundName;
    } else {
      return NextResponse.json(
        { error: "대상이 없습니다. (receiver_id / recipient_id / to / username / post 중 하나 필요)" },
        { status: 400 }
      );
    }

    // 메시지 insert (receiver_id / recipient_id 자동 대응)
    const ins = await insertMessageFlexible({
      sender_id: me.userId,
      receiver_id: receiverId,
      content,
      read: false,
    });

    if (!ins.ok) {
      return NextResponse.json({ error: ins.error ?? "메시지 저장 실패" }, { status: 500 });
    }

    // DM 알림 생성(실패해도 DM은 성공)
    await insertDmNotification(receiverId, me.username);

    return NextResponse.json(
      {
        ok: true,
        id: ins.id,
        receiver_id: receiverId,
        username: resolvedName ?? usernameRaw ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}
