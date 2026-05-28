import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function requireUser() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false as const, status: 401, error: "로그인이 필요합니다.", user: null, profile: null };

  const sb = adminClient();
  const { data: profile, error } = await sb
    .from("profiles")
    .select("username,role,points,badge,grade,class_no,student_no,student_name,student_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, error: error.message, user: null, profile: null };
  return { ok: true as const, user, profile: profile ?? null };
}

export async function requireAdmin() {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  if ((auth.profile as any)?.role !== "admin") {
    return { ok: false as const, status: 403, error: "권한이 없습니다.", user: null, profile: null };
  }
  return auth;
}
