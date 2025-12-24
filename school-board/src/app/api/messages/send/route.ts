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
 * 인증/role 판단은 /api/me에서 하므로, 여기서는 쿠키를 그대로 넘겨서 /api/me 결과를 사용
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
    userId: (json?.userId ?? null) as string | null,
    role: (json?.role ?? "guest") as string,
    username: (json?.username ?? null) as string | null,
  };
}

async function resolveReceiverIdByUsername(usernameRaw: string) {
  const supa = adminClient();
  const username = cleanUsername(usernameRaw);

  if (!username) {
    return { receiverId: null as string | null, foundName: null as string | null, err: "username이 비었습니다." };
  }

  // 1) 정확히(대소문자 무시)
  {
    const { data, error } = await supa.from("profiles").select("id, username").ilike("username", username).limit(5);

    if (!error && Array.isArray(data) && data.length === 1) {
      return {
        receiverId: data[0].id as string,
        foundName: (data[0].username as string) ?? null,
        err: null as string | null,
      };
    }
    if (!error && Array.isArray(data) && data.length > 1) {
      return { receiverId: null, foundName: null, err: `username '${username}' 이(가) 여러 명입니다. (중복 username)` };
    }
  }

  // 2) 소문자 버전도 재시도
  {
    const low = username.toLowerCase();
    const { data, error } = await supa.from("profiles").select("id, username").ilike("username", low).limit(5);

    if (!error && Array.isArray(data) && data.length === 1) {
      return {
        receiverId: data[0].id as string,
        foundName: (data[0].username as string) ?? null,
        err: null as string | null,
      };
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

  return { receiverId: receiverId as string, err: null as string | null };
}

/**
 * messages 테이블이 receiver_id / recipient_id 둘 중 뭐를 쓰는지 모르니
 * receiver_id로 먼저 넣고, 컬럼 에러면 recipient_id로 재시도
 */
async function insertMessageFlexible(payload: any) {
  const supa = adminClient();

  // 1) receiver_id
  {
    const { data, error } = await supa.from("messages").insert(payload).select("id").maybeSingle();
    if (!error) return { ok: true, id: (data as any)?.id ?? null, used: "receiver_id" as const };

    const msg = String(error.message || "").toLowerCase();
    if (!msg.includes("receiver_id")) {
      return { ok: false, error: error.message };
    }
  }

  // 2) recipient_id 재시도
  const { receiver_id, ...rest } = payload;
  const payload2 = { ...rest, recipient_id: receiver_id };

  const { data: data2, error: error2 } = await supa.from("messages").insert(payload2).select("id").maybeSingle();
  if (error2) return { ok: false, error: error2.message };

  return { ok: true, id: (data2 as any)?.id ?? null, used: "recipient_id" as const };
}

async function insertDmNotification(receiverId: string, actorUsername: string | null) {
  const supa = adminClient();

  // ✅ supabase-js는 Promise에 .catch 체이닝하는 방식 대신
  // { error }를 받아서 처리하는 게 안전함
  const { error } = await supa.from("notifications").insert({
    type: "dm",
    recipient_id: receiverId,
    actor_username: actorUsername ?? "admin",
    post_id: null,
    read: false,
  });

  // 실패해도 DM은 성공 처리
  if (error) return;
}

export async function POST(req: NextRequest) {
  try {
    const me = await getMeFromApi(req);

    if (!me.userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (me.role !== "admin") return NextResponse.json({ error: "관리자만 DM을 보낼 수 있습니다." }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    const content = String(body?.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "content가 비었습니다." }, { status: 400 });

    // ✅ 여기서 파서 에러났던 부분: 괄호/세미콜론까지 확실히 닫음
    const receiverIdRaw = String(body?.receiver_id ?? body?.recipient_id ?? "").trim();
    const usernameRaw = String(body?.to ?? body?.username ?? "").trim();
    const postRaw = String(body?.post ?? body?.post_id ?? "").trim();

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

    // ✅ 타입 확정 (여기 지나면 receiverId는 무조건 string)
    if (!receiverId) return NextResponse.json({ error: "receiverId 해석 실패" }, { status: 400 });
    const receiverIdFinal = receiverId;

    // 메시지 insert (receiver_id / recipient_id 자동 대응)
    const ins = await insertMessageFlexible({
      sender_id: me.userId,
      receiver_id: receiverIdFinal,
      content,
      read: false,
    });

    if (!ins.ok) {
      return NextResponse.json({ error: ins.error ?? "메시지 저장 실패" }, { status: 500 });
    }

    // DM 알림 생성(실패해도 DM은 성공)
    await insertDmNotification(receiverIdFinal, me.username);

    return NextResponse.json(
      {
        ok: true,
        id: ins.id,
        receiver_id: receiverIdFinal,
        username: resolvedName ?? (usernameRaw || null),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}
