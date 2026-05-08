import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canManageMealRatings } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MealType = "breakfast" | "lunch" | "dinner";
type RatingMap = Record<MealType, number | null>;

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && MEAL_TYPES.includes(value as MealType);
}

function ratingKey(ymd: string, mealType: MealType) {
  return `meal_rating:${ymd}:${mealType}`;
}

function parseYmd(value: string | null) {
  const ymd = (value ?? "").trim();
  return /^\d{8}$/.test(ymd) ? ymd : null;
}

function normalizeScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 5) return null;
  return Math.round(score * 10) / 10;
}

async function getViewer() {
  const sb = await createAuthedClient();
  const { data } = await sb.auth.getUser();
  const user = data.user;

  if (!user) {
    return { userId: null as string | null, role: "guest" };
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, role: String((profile as any)?.role ?? "user") };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ymd = parseYmd(searchParams.get("ymd"));

  if (!ymd) {
    return NextResponse.json({ error: "ymd 형식이 올바르지 않습니다.(YYYYMMDD)" }, { status: 400 });
  }

  const viewer = await getViewer();
  const keys = MEAL_TYPES.map((mealType) => ratingKey(ymd, mealType));
  const { data, error } = await supabaseAdmin
    .from("site_stats")
    .select("key,value")
    .in("key", keys);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ratings: RatingMap = { breakfast: null, lunch: null, dinner: null };
  for (const row of data ?? []) {
    const mealType = MEAL_TYPES.find((type) => String((row as any).key).endsWith(`:${type}`));
    if (!mealType) continue;
    const score = normalizeScore((row as any).value);
    ratings[mealType] = score;
  }

  return NextResponse.json({
    ymd,
    ratings,
    canRate: canManageMealRatings(viewer.role),
    role: viewer.role,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ymd = parseYmd(typeof body?.ymd === "string" ? body.ymd : null);
  const mealType = isMealType(body?.mealType) ? body.mealType : null;
  const score = normalizeScore(body?.score);

  if (!ymd || !mealType || score === null) {
    return NextResponse.json({ error: "날짜, 급식 종류, 0~5점 점수가 필요합니다." }, { status: 400 });
  }

  const viewer = await getViewer();
  if (!viewer.userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!canManageMealRatings(viewer.role)) {
    return NextResponse.json({ error: "급식 별점 등록 권한이 없습니다." }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("site_stats")
    .upsert({ key: ratingKey(ymd, mealType), value: score }, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ymd, mealType, score });
}
