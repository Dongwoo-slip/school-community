import { ImageResponse } from "next/og";
import { createElement as h } from "react";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function q(url: URL, key: string, def = "0") {
  return url.searchParams.get(key) ?? def;
}

function nfmt(v: string) {
  const num = Number(String(v).replaceAll(",", "").trim());
  if (Number.isFinite(num)) return num.toLocaleString("ko-KR");
  return "0";
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const date = q(url, "d", ""); // 예: 2026-01-07
  const tp = nfmt(q(url, "tp"));
  const tc = nfmt(q(url, "tc"));
  const tm = nfmt(q(url, "tm"));
  const tv = nfmt(q(url, "tv"));
  const np = nfmt(q(url, "np"));
  const nc = nfmt(q(url, "nc"));
  const nr = nfmt(q(url, "nr"));
  const orr = nfmt(q(url, "or"));

  const rows: Array<[string, string]> = [
    ["전체 글", `${tp}개`],
    ["전체 댓글", `${tc}개`],
    ["총 회원", `${tm}명`],
    ["누적 방문", `${tv}회`],
    ["새 글", `${np}개`],
    ["새 댓글", `${nc}개`],
    ["신고", `${nr}건`],
    ["미처리", `${orr}건`],
  ];

  const card = (label: string, value: string) =>
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 20px",
          borderRadius: 18,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
        },
      },
      h("div", { style: { fontSize: 24, opacity: 0.9 } }, label),
      h("div", { style: { fontSize: 30, fontWeight: 900, letterSpacing: "-0.01em" } }, value)
    );

  const element = h(
    "div",
    {
      style: {
        width: "800px",
        height: "800px",
        display: "flex",
        padding: "40px",
        background: "linear-gradient(180deg, #071521 0%, #0B2A3A 55%, #071521 100%)",
        color: "#EAF2FF",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
      },
    },
    h(
      "div",
      { style: { width: "100%", display: "flex", flexDirection: "column", gap: "18px" } },
      // header
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "6px" } },
        h("div", { style: { fontSize: 40, fontWeight: 900, letterSpacing: "-0.02em" } }, "📊 Square 일일 요약"),
        h("div", { style: { fontSize: 20, opacity: 0.8 } }, date ? `기준일: ${date}` : "")
      ),

      // grid (네모칸)
      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            marginTop: "10px",
          },
        },
        ...rows.map(([k, v]) => card(k, v))
      ),

      h("div", { style: { marginTop: "auto", fontSize: 16, opacity: 0.65 } }, "cjconnect2.vercel.app")
    )
  );

  return new ImageResponse(element, {
    width: 800,
    height: 800,
    headers: {
      // 카카오가 캐시 이상하게 잡는 케이스 방지
      "Cache-Control": "no-store",
    },
  });
}
