import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function koreaYMD() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}${m}${d}`;
}

function splitMenu(ddish: string) {
  return String(ddish ?? "")
    .split("<br/>")
    .map((s) => s.replace(/&amp;/g, "&").trim())
    .filter(Boolean);
}

// GET /api/neis/meal?ymd=YYYYMMDD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ymd = (searchParams.get("ymd") ?? koreaYMD()).trim();

  if (!/^\d{8}$/.test(ymd)) {
    return NextResponse.json({ error: "ymd 형식이 올바르지 않습니다.(YYYYMMDD)" }, { status: 400 });
  }

  const KEY = process.env.NEIS_KEY!;
  const ATPT = process.env.NEIS_ATPT_CODE!;
  const SCH = process.env.NEIS_SCHOOL_CODE!;

  const url =
    `https://open.neis.go.kr/hub/mealServiceDietInfo` +
    `?KEY=${encodeURIComponent(KEY)}` +
    `&Type=json&pIndex=1&pSize=100` +
    `&ATPT_OFCDC_SC_CODE=${encodeURIComponent(ATPT)}` +
    `&SD_SCHUL_CODE=${encodeURIComponent(SCH)}` +
    `&MLSV_YMD=${encodeURIComponent(ymd)}`;

  let json: any = null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    json = await res.json().catch(() => null);
  } catch {
    return NextResponse.json({ ymd, lunch: [], dinner: [], ok: false }, { status: 200 });
  }

  const rows = Array.isArray(json?.mealServiceDietInfo?.[1]?.row) ? json.mealServiceDietInfo[1].row : [];

  let lunch: string[] = [];
  let dinner: string[] = [];

  for (const r of rows) {
    const code = String(r?.MMEAL_SC_CODE ?? "");
    const items = splitMenu(String(r?.DDISH_NM ?? ""));
    if (code === "2") lunch = items; // 중식
    if (code === "3") dinner = items; // 석식
  }

  return NextResponse.json({ ymd, lunch, dinner, ok: true });
}
