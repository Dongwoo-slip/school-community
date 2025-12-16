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

export async function GET() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  // ✅ 응답 캐시 방지 헤더
  const noStore = { "Cache-Control": "no-store, max-age=0" };

  if (!user) {
    return NextResponse.json({ userId: null, role: "guest", username: null }, { headers: noStore });
  }

  const username = usernameFromEmail(user.email);

  try {
    const sb = admin();
    const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();

    return NextResponse.json(
      {
        userId: user.id,
        role: profile?.role ?? "user",
        username,
      },
      { headers: noStore }
    );
  } catch {
    return NextResponse.json({ userId: user.id, role: "user", username }, { headers: noStore });
  }
}
