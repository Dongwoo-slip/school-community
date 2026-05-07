const NEIS_BASE = "https://open.neis.go.kr/hub";

export function getNeisBase() {
  return NEIS_BASE;
}

/**
 * ✅ 너가 쓰는 변수명 우선:
 * - NEIS_KEY
 *
 * (호환) 예전/다른 이름도 허용:
 * - NEIS_API_KEY, NEIS_OPENAPI_KEY, NEIS_AUTH_KEY
 */
export function getNeisKey() {
  const key =
    (process.env.NEIS_KEY || "").trim() ||
    (process.env.NEIS_API_KEY || "").trim() ||
    (process.env.NEIS_OPENAPI_KEY || "").trim() ||
    (process.env.NEIS_AUTH_KEY || "").trim();

  if (!key) {
    throw new Error("Missing NEIS key. Set NEIS_KEY in env.");
  }
  return key;
}

/**
 * ✅ 너가 쓰는 변수명 우선:
 * - NEIS_ATPT_CODE (교육청 코드)
 * - NEIS_SCHOOL_CODE (학교 코드)
 *
 * (호환) 다른 이름도 허용:
 * - NEIS_ATPT_OFCDC_SC_CODE / NEIS_SD_SCHUL_CODE
 * - ATPT_OFCDC_SC_CODE / SD_SCHUL_CODE
 */
export function getSchoolCodesFromEnv() {
  const office =
    (process.env.NEIS_ATPT_CODE || "").trim() ||
    (process.env.NEIS_ATPT_OFCDC_SC_CODE || "").trim() ||
    (process.env.ATPT_OFCDC_SC_CODE || "").trim();

  const school =
    (process.env.NEIS_SCHOOL_CODE || "").trim() ||
    (process.env.NEIS_SD_SCHUL_CODE || "").trim() ||
    (process.env.SD_SCHUL_CODE || "").trim();

  if (office && school) return { ATPT_OFCDC_SC_CODE: office, SD_SCHUL_CODE: school };
  return null;
}

export async function neisFetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`NEIS ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`NEIS JSON parse failed: ${text.slice(0, 200)}`);
  }
}

export async function getSchoolCodesByName(schoolName: string) {
  const key = getNeisKey();
  const url =
    `${NEIS_BASE}/schoolInfo?KEY=${encodeURIComponent(key)}` +
    `&Type=json&pIndex=1&pSize=50&SCHUL_NM=${encodeURIComponent(schoolName)}`;

  const data = await neisFetchJson(url);
  const rows = data?.schoolInfo?.[1]?.row ?? [];
  if (!rows.length) throw new Error(`schoolInfo not found: ${schoolName}`);

  const r = rows[0];
  return {
    ATPT_OFCDC_SC_CODE: r.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: r.SD_SCHUL_CODE,
  };
}
