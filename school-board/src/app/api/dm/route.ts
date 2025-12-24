import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies().getAll();
        },
        setAll(cookiesToSet) {
          const c = cookies();
          cookiesToSet.forEach(({ name, value, options }) => c.set(name, value, options));
        },
      },
    }
  );
}

export async function GET(req: Request) {
  const supabase = supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 50);

  const { data, error } = await supabase
    .from("direct_messages")
    .select("id,sender_id,receiver_id,content,created_at,read_at")
    .eq("receiver_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const receiver_id = String(body.receiver_id ?? "");
  const content = String(body.content ?? "").trim();

  if (!receiver_id || !content) {
    return NextResponse.json({ error: "receiver_id/content required" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "content too long (<=2000)" }, { status: 400 });
  }

  // ✅ admin 체크 (profiles.role)
  const { data: meProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (meProfile?.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      sender_id: user.id,
      receiver_id,
      content,
    })
    .select("id,created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ✅ 알림은 트리거가 자동 생성
  return NextResponse.json({ ok: true, data });
}
