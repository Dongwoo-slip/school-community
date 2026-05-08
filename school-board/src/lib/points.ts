import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

function usernameFromUser(user: any) {
  const metaName = String(user?.user_metadata?.username ?? "").trim();
  if (metaName) return metaName;

  const emailName = String(user?.email ?? "").split("@")[0]?.trim();
  if (emailName) return emailName;

  return `user_${String(user?.id ?? "").slice(0, 8)}`;
}

export async function awardPoints(user: any, delta: number) {
  if (!user?.id || !Number.isFinite(delta) || delta === 0) return null;

  const sb = admin();
  const { data: profile, error: readErr } = await sb
    .from("profiles")
    .select("id, username, points, badge")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) throw readErr;

  const nextPoints = Math.max(0, (Number(profile?.points) || 0) + delta);

  if (!profile) {
    const { data, error } = await sb
      .from("profiles")
      .insert({
        id: user.id,
        username: usernameFromUser(user),
        role: "user",
        points: nextPoints,
        badge: [],
      })
      .select("points, badge")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await sb
    .from("profiles")
    .update({ points: nextPoints })
    .eq("id", user.id)
    .select("points, badge")
    .single();

  if (error) throw error;
  return data;
}

