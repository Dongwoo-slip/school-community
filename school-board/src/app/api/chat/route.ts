import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { formatAdminStudentLabel, type AuthorIdentity } from "@/lib/authorDisplay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

function makeAnonId(userId: string) {
  const s = String(userId).replace(/-/g, "");
  return `익명${s.slice(0, 4)}`;
}

async function isVerifiedChatter(sb: ReturnType<typeof admin>, userId: string) {
  const { data: profile, error } = await sb
    .from("profiles")
    .select("role, student_verified, student_no, student_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (profile?.role === "admin") return true;
  if (profile?.student_verified || profile?.student_no || profile?.student_name) return true;

  const { data: verification, error: verificationError } = await sb
    .from("student_verification_codes")
    .select("id")
    .eq("used_by", userId)
    .maybeSingle();

  if (verificationError) throw verificationError;
  return Boolean(verification?.id);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "25"), 50);
  const before = url.searchParams.get("before"); // created_at

  const sb = admin();
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  let isAdmin = false;
  if (user?.id) {
    const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  let q = sb
    .from("chat_messages")
    .select("id,content,user_id,anon_id,created_at")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const arr = data ?? [];
  const hasMore = arr.length > limit;
  const sliced = hasMore ? arr.slice(0, limit) : arr;

  if (!isAdmin) {
    return NextResponse.json({
      data: sliced.map((m: any) => ({
        ...m,
        user_id: user?.id && m.user_id === user.id ? m.user_id : "",
      })),
      hasMore,
    });
  }

  const ids = Array.from(new Set(sliced.map((m: any) => m.user_id).filter(Boolean).map(String)));
  const profileMap = new Map<string, (AuthorIdentity & { id: string }) | null>();
  if (ids.length) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id, username, role, points, student_no, student_name, student_verified, grade, class_no")
      .in("id", ids);
    (profiles ?? []).forEach((p: any) => profileMap.set(String(p.id), p ?? null));
  }

  return NextResponse.json({
    data: sliced.map((m: any) => {
      const profile = m.user_id ? profileMap.get(String(m.user_id)) ?? null : null;
      return {
        ...m,
        author_username: profile?.username ?? null,
        author_student_label: formatAdminStudentLabel(profile),
      };
    }),
    hasMore,
  });
}

export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim().slice(0, 500);
  if (!content) return NextResponse.json({ error: "내용이 비었습니다." }, { status: 400 });

  const sb = admin();

  try {
    const verified = await isVerifiedChatter(sb, user.id);
    if (!verified) {
      return NextResponse.json(
        { error: "개별인증이 필요합니다. 마이페이지에서 인증코드를 등록한 뒤 익명채팅을 이용해 주세요.", code: "STUDENT_VERIFICATION_REQUIRED" },
        { status: 403 }
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "인증 상태를 확인하지 못했습니다." }, { status: 500 });
  }

  // ✅ 도배 방지: 3초 이내 작성 여부 확인
  const { data: lastMsg } = await sb
    .from("chat_messages")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMsg) {
    const diff = Date.now() - new Date(lastMsg.created_at).getTime();
    if (diff < 3000) {
      return NextResponse.json({ error: "너무 자주 메시지를 보낼 수 없습니다. 3초 후에 다시 시도하세요." }, { status: 429 });
    }
  }

  // ✅ username 컬럼 없이 insert
  const row = {
    content,
    user_id: user.id,
    anon_id: makeAnonId(user.id),
  };
  const { data: inserted, error } = await sb
    .from("chat_messages")
    .insert(row)
    .select("id,content,user_id,anon_id,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: inserted });
}

export async function DELETE(req: Request) {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sb = admin();
  const { data: profile, error: profileError } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (profile?.role !== "admin") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

  const { error } = await sb.from("chat_messages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
