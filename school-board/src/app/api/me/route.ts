import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

export async function GET() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ userId: null, role: "guest", username: null });
  }

  const username = usernameFromEmail(user.email);

  // profiles가 없거나 조회 실패하면 role은 user로 처리
  try {
    const sb = admin();
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      userId: user.id,
      role: profile?.role ?? "user",
      username,
    });
  } catch {
    return NextResponse.json({ userId: user.id, role: "user", username });
  }
}
