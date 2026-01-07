import { supabaseAdmin } from "@/lib/supabase/admin";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  token_type?: string;
  scope?: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function kakaoConfig() {
  return {
    clientId: mustEnv("KAKAO_REST_API_KEY"),
    redirectUri: mustEnv("KAKAO_REDIRECT_URI"),
    siteUrl: process.env.SITE_URL || "https://cjconnect2.vercel.app",
  };
}

export async function getRefreshTokenFromDb() {
  const { data, error } = await supabaseAdmin
    .from("kakao_tokens")
    .select("refresh_token")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`DB read kakao_tokens failed: ${error.message}`);
  return data?.refresh_token || "";
}

export async function saveRefreshTokenToDb(refreshToken: string) {
  const { error } = await supabaseAdmin
    .from("kakao_tokens")
    .upsert({ id: 1, refresh_token: refreshToken, updated_at: new Date().toISOString() });

  if (error) throw new Error(`DB upsert kakao_tokens failed: ${error.message}`);
}

export async function exchangeCodeForToken(code: string) {
  const { clientId, redirectUri } = kakaoConfig();

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    }),
  });

  const json = (await res.json()) as TokenResponse & Record<string, unknown>;
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  return json as TokenResponse;
}

export async function refreshAccessToken() {
  const { clientId } = kakaoConfig();
  const refreshToken = await getRefreshTokenFromDb();
  if (!refreshToken) throw new Error("No refresh_token in DB. Run /api/KaKao/login first.");

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  const json = (await res.json()) as TokenResponse & Record<string, unknown>;
  if (!res.ok) throw new Error(`Refresh failed: ${JSON.stringify(json)}`);

  if ((json as TokenResponse).refresh_token) {
    await saveRefreshTokenToDb((json as TokenResponse).refresh_token!);
  }

  return json as TokenResponse;
}

// ✅ 표/카드처럼 예쁘게 보내기(피드 템플릿)
export async function sendMemoTemplate(templateObject: any) {
  const token = await refreshAccessToken();

  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({
      template_object: JSON.stringify(templateObject),
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Send failed: ${JSON.stringify(json)}`);
  return json;
}
