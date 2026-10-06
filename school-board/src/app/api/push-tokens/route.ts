import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

function defaultEnvironment() {
  const configured = process.env.APNS_ENV;
  if (configured === "production" || configured === "development") return configured;
  return process.env.VERCEL_ENV === "production" ? "production" : "development";
}

function cleanToken(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "");
}

export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = cleanToken(body?.token ?? body?.deviceToken ?? body?.value);
  const platform = String(body?.platform ?? "ios").trim().toLowerCase();
  const requestedEnvironment = body?.environment ?? body?.apsEnvironment ?? body?.apnsEnvironment;
  const environment = requestedEnvironment === "production" || requestedEnvironment === "development"
    ? requestedEnvironment
    : defaultEnvironment();
  const appId = String(body?.appId ?? body?.bundleId ?? process.env.APNS_BUNDLE_ID ?? "com.squarecj.app").trim();
  const deviceId = body?.deviceId ? String(body.deviceId).trim().slice(0, 200) : null;

  if (!token) return NextResponse.json({ error: "push token이 필요합니다." }, { status: 400 });
  if (platform !== "ios") return NextResponse.json({ error: "지원하지 않는 platform입니다." }, { status: 400 });

  const sb = admin();

  await sb.from("push_tokens").delete().eq("token", token).neq("user_id", user.id);

  const { data: row, error } = await sb
    .from("push_tokens")
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        environment,
        app_id: appId,
        device_id: deviceId,
        enabled: true,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    )
    .select("id,environment,platform,enabled,last_seen_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data: row });
}

export async function DELETE(req: Request) {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = cleanToken(body?.token ?? body?.deviceToken ?? body?.value);
  if (!token) return NextResponse.json({ error: "push token이 필요합니다." }, { status: 400 });

  const { error } = await admin()
    .from("push_tokens")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("token", token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
