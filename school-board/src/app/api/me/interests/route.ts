import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED = new Set([
  "물리", "화학", "생명과학", "지구과학",
  "수학", "컴공", "AI/데이터", "로봇",
  "사회", "경제", "의료보건", "교사/교육",
  "디자인", "영상", "음악", "미술", "체육",
  "대회/공모전", "스터디", "프로젝트", "봉사"
]);

export async function POST(req: Request) {
  const sb = await createAuthedClient();
  const { data } = await sb.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body?.interests) ? body.interests : [];
  const interests = raw
    .map((x: any) => String(x ?? "").trim())
    .filter((x: string) => x.length > 0)
    .filter((x: string) => ALLOWED.has(x))
    .slice(0, 12); // 너무 많이 저장 방지

  const { error } = await sb
    .from("profiles")
    .update({ interests })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, interests });
}
