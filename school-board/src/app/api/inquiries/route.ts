import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MessagePayload = {
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
};

async function insertMessageFlexible(payload: MessagePayload) {
  const supa = adminClient();

  const { data, error } = await supa.from("messages").insert(payload).select("id").maybeSingle();
  if (!error) return { ok: true, id: data?.id ?? null };

  if (!String(error.message || "").toLowerCase().includes("receiver_id")) {
    return { ok: false, error: error.message, id: null };
  }

  const { receiver_id, ...rest } = payload;
  const { data: fallbackData, error: fallbackError } = await supa
    .from("messages")
    .insert({ ...rest, recipient_id: receiver_id })
    .select("id")
    .maybeSingle();

  if (fallbackError) return { ok: false, error: fallbackError.message, id: null };
  return { ok: true, id: fallbackData?.id ?? null };
}

async function notifyAdmin(adminId: string, actorUsername: string | null) {
  const supa = adminClient();
  await supa.from("notifications").insert({
    type: "dm",
    recipient_id: adminId,
    actor_username: actorUsername ?? "unknown",
    post_id: null,
    read: false,
  });
}

export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 120);
  const content = String(body?.content ?? "").trim().slice(0, 2000);

  if (title.length < 2) return NextResponse.json({ error: "제목을 2글자 이상 입력해 주세요." }, { status: 400 });
  if (content.length < 5) return NextResponse.json({ error: "문의 내용을 5글자 이상 입력해 주세요." }, { status: 400 });

  const supa = adminClient();
  const [{ data: profile, error: profileError }, { data: admins, error: adminError }] = await Promise.all([
    supa.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supa.from("profiles").select("id, username").eq("role", "admin").limit(1),
  ]);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (adminError) return NextResponse.json({ error: adminError.message }, { status: 500 });

  const admin = Array.isArray(admins) ? admins[0] : null;
  if (!admin?.id) return NextResponse.json({ error: "문의 받을 관리자 계정을 찾지 못했습니다." }, { status: 500 });

  const actorUsername = typeof profile?.username === "string" ? profile.username : null;
  const message = [
    `[문의] ${title}`,
    "",
    `보낸 사람: ${actorUsername ?? user.email ?? user.id}`,
    "",
    content,
  ].join("\n");

  const inserted = await insertMessageFlexible({
    sender_id: user.id,
    receiver_id: admin.id,
    content: message,
    read: false,
  });

  if (!inserted.ok) {
    return NextResponse.json({ error: inserted.error ?? "문의 저장 실패" }, { status: 500 });
  }

  await notifyAdmin(admin.id, actorUsername);

  return NextResponse.json({ ok: true, id: inserted.id });
}
