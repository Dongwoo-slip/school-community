import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

function ipFromRequest(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || null;
}

function parseDevice(userAgent: string) {
  const ua = userAgent || "";
  const os =
    /iPhone|iPad|iPod/i.test(ua) ? "iOS" :
    /Android/i.test(ua) ? "Android" :
    /Mac OS X|Macintosh/i.test(ua) ? "macOS" :
    /Windows/i.test(ua) ? "Windows" :
    /Linux/i.test(ua) ? "Linux" :
    "Unknown OS";

  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /Chrome\//i.test(ua) && !/Chromium/i.test(ua) ? "Chrome" :
    /Safari\//i.test(ua) && !/Chrome\//i.test(ua) ? "Safari" :
    /Firefox\//i.test(ua) ? "Firefox" :
    "Unknown Browser";

  const device =
    /iPad/i.test(ua) ? "iPad" :
    /iPhone/i.test(ua) ? "iPhone" :
    /Android/i.test(ua) && /Mobile/i.test(ua) ? "Android Phone" :
    /Android/i.test(ua) ? "Android Tablet" :
    /Mobile/i.test(ua) ? "Mobile" :
    "Desktop";

  return {
    os,
    browser,
    device,
    label: [device, os, browser].filter(Boolean).join(" · "),
  };
}

type ProfileRow = {
  id: string;
  username: string | null;
  role: string | null;
};

type LoginLogBody = {
  userAgent?: unknown;
  platform?: unknown;
  screen?: unknown;
  language?: unknown;
  timezone?: unknown;
};

function isMissingLoginLogsTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /admin_login_logs/i.test(error.message ?? "") && /schema cache|does not exist|not find/i.test(error.message ?? "")
  );
}

async function getAuthedAdmin() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false as const, status: 401, error: "로그인이 필요합니다." };

  const sb = admin();
  const { data: profile, error } = await sb
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, error: error.message };
  const profileRow = profile as ProfileRow | null;
  if (profileRow?.role !== "admin") return { ok: false as const, status: 403, error: "권한이 없습니다." };

  return {
    ok: true as const,
    userId: user.id,
    username: profileRow?.username ?? user.email ?? null,
  };
}

export async function GET() {
  const auth = await getAuthedAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const sb = admin();
  const { data, error } = await sb
    .from("admin_login_logs")
    .select("id, admin_id, username, login_at, ip_address, user_agent, device_label, browser, os, platform, screen, language, timezone")
    .order("login_at", { ascending: false })
    .limit(300);

  if (isMissingLoginLogsTable(error)) {
    return NextResponse.json({
      ok: true,
      data: [],
      setupRequired: true,
      error: "admin_login_logs 테이블 생성이 필요합니다.",
    });
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthedAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({})) as LoginLogBody;
  const userAgent = req.headers.get("user-agent") ?? String(body?.userAgent ?? "");
  const parsed = parseDevice(userAgent);

  const sb = admin();
  const { error } = await sb.from("admin_login_logs").insert({
    admin_id: auth.userId,
    username: auth.username,
    login_at: new Date().toISOString(),
    ip_address: ipFromRequest(req),
    user_agent: userAgent,
    device_label: parsed.label,
    browser: parsed.browser,
    os: parsed.os,
    platform: String(body?.platform ?? "").slice(0, 120) || null,
    screen: String(body?.screen ?? "").slice(0, 80) || null,
    language: String(body?.language ?? "").slice(0, 40) || null,
    timezone: String(body?.timezone ?? "").slice(0, 80) || null,
  });

  if (isMissingLoginLogsTable(error)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      setupRequired: true,
      error: "admin_login_logs 테이블 생성이 필요합니다.",
    });
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
