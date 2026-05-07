import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function splitDish(ddish: string | undefined) {
  if (!ddish) return [];
  return ddish
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 80);
}

function isLunch(row: any) {
  const code = String(row?.MMEAL_SC_CODE ?? "");
  const name = String(row?.MMEAL_SC_NM ?? "");
  return code === "2" || name.includes("중식");
}
function isDinner(row: any) {
  const code = String(row?.MMEAL_SC_CODE ?? "");
  const name = String(row?.MMEAL_SC_NM ?? "");
  return code === "3" || name.includes("석식");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateRaw = String(searchParams.get("date") ?? "").trim(); // YYYYMMDD 또는 YYYYMM

  const KEY = process.env.NEIS_KEY;
  const ATPT = process.env.NEIS_ATPT_CODE; // 예: T10
  const SCHOOL = process.env.NEIS_SCHOOL_CODE; // 예: 9290083

  if (!KEY || !ATPT || !SCHOOL) {
    return NextResponse.json(
      { error: "NEIS env 설정 필요 (NEIS_KEY/NEIS_ATPT_CODE/NEIS_SCHOOL_CODE)" },
      { status: 500 }
    );
  }

  if (!(dateRaw.length === 8 || dateRaw.length === 6)) {
    return NextResponse.json({ error: "date는 YYYYMMDD 또는 YYYYMM 이어야 합니다." }, { status: 400 });
  }

  const base = "https://open.neis.go.kr/hub/mealServiceDietInfo";

  // ✅ 하루(YYYYMMDD)면 그 날짜만, 월(YYYYMM)면 그 달 전체(최대 pSize로)
  const url =
    `${base}?KEY=${encodeURIComponent(KEY)}` +
    `&Type=json&pIndex=1&pSize=200` +
    `&ATPT_OFCDC_SC_CODE=${encodeURIComponent(ATPT)}` +
    `&SD_SCHUL_CODE=${encodeURIComponent(SCHOOL)}` +
    `&MLSV_YMD=${encodeURIComponent(dateRaw)}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  const rows = json?.mealServiceDietInfo?.[1]?.row;
  if (!Array.isArray(rows) || rows.length === 0) {
    // ✅ 주말/방학 등은 정상적으로 "없음"
    return NextResponse.json({
      date: dateRaw,
      lunch: [],
      dinner: [],
      rawCount: 0,
    });
  }

  // ✅ 월 조회(YYYYMM)로 들어온 경우, “오늘(또는 요청한 일)” 선택은 프론트에서 할 수도 있는데
  // 지금은 서버에서 그냥 lunch/dinner 합쳐서 반환(가장 첫 row 기준) 대신,
  // date=YYYYMMDD 사용을 권장.
  const lunchRow = rows.find(isLunch);
  const dinnerRow = rows.find(isDinner);

  const lunch = splitDish(lunchRow?.DDISH_NM);
  const dinner = splitDish(dinnerRow?.DDISH_NM);

  return NextResponse.json({
    date: dateRaw,
    lunch,
    dinner,
    rawCount: rows.length,
  });
}
