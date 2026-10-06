import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const ACCESS_DENIED_MESSAGE =
  "학교 외부 IP로는 접근 하실수없습니다.(학번이 인증된ID 또는 허용된 IP에서만 접근 가능합니다)";

function requestIp(request: NextRequest) {
  const raw =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "";

  return raw.trim().replace(/^::ffff:/, "").replace(/^\[|\]$/g, "");
}

function ipv4Number(value: string) {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts.reduce((total, part) => ((total << 8) | part) >>> 0, 0);
}

function matchesIpRule(ip: string, rule: string) {
  if (!rule.includes("/")) return ip === rule;

  const [network, prefixText] = rule.split("/");
  const ipNumber = ipv4Number(ip);
  const networkNumber = ipv4Number(network);
  const prefix = Number(prefixText);
  if (ipNumber === null || networkNumber === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNumber & mask) === (networkNumber & mask);
}

function isAllowedSchoolIp(request: NextRequest) {
  const ip = requestIp(request);
  if (process.env.NODE_ENV !== "production" && (ip === "127.0.0.1" || ip === "::1" || !ip)) return true;

  const rules = (process.env.SCHOOL_ALLOWED_IPS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Boolean(ip && rules.some((rule) => matchesIpRule(ip, rule)));
}

function isCjconnectMirror(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const deploymentHost = (process.env.VERCEL_URL ?? "").toLowerCase();
  return host === "cjconnect2.vercel.app" || Boolean(deploymentHost && host === deploymentHost);
}

function isAccessBootstrapPath(pathname: string) {
  return (
    pathname === "/restricted" ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/logout" ||
    pathname === "/api/me" ||
    pathname.startsWith("/api/stats/") ||
    pathname.startsWith("/api/student-verification/") ||
    pathname.startsWith("/api/KaKao/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/ads.txt"
  );
}

async function hasVerifiedAccount(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) return false;

  try {
    const authClient = createServerClient(url, publicKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    });
    const { data, error } = await authClient.auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (error || !userId) return false;

    const adminClient = createAdminClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role,student_verified,student_no,student_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) return false;
    return Boolean(
      profile.role === "admin" ||
      profile.student_verified ||
      profile.student_no ||
      profile.student_name
    );
  } catch {
    return false;
  }
}

function copySessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isCjconnectMirror(request) || isAccessBootstrapPath(pathname) || isAllowedSchoolIp(request) || await hasVerifiedAccount(request)) {
    return sessionResponse;
  }

  if (pathname.startsWith("/api/")) {
    return copySessionCookies(
      sessionResponse,
      NextResponse.json({ error: ACCESS_DENIED_MESSAGE }, { status: 403 })
    );
  }

  const restrictedUrl = request.nextUrl.clone();
  restrictedUrl.pathname = "/restricted";
  restrictedUrl.search = "";
  return copySessionCookies(sessionResponse, NextResponse.rewrite(restrictedUrl));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
