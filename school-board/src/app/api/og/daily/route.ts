import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function q(url: URL, key: string, def = "0") {
  return url.searchParams.get(key) ?? def;
}

function fmt(n: string) {
  const num = Number(String(n).replaceAll(",", "").trim());
  if (Number.isFinite(num)) return num.toLocaleString("en-US");
  return String(n);
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const title = q(url, "title", "Square Daily Summary");
  const subtitle = q(url, "sub", "");
  const logo = q(url, "logo", "");

  const rows: Array<[string, string]> = [
    ["Total Posts", `${fmt(q(url, "tp"))}`],
    ["Total Comments", `${fmt(q(url, "tc"))}`],
    ["Total Members", `${fmt(q(url, "tm"))}`],
    ["Total Visits", `${fmt(q(url, "tv"))}`],
    ["New Posts", `${fmt(q(url, "np"))}`],
    ["New Comments", `${fmt(q(url, "nc"))}`],
    ["New Reports", `${fmt(q(url, "nr"))}`],
    ["Open Reports", `${fmt(q(url, "or"))}`],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          padding: "48px",
          background: "linear-gradient(180deg, #071521 0%, #0B2A3A 55%, #071521 100%)",
          color: "#EAF2FF",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
        }}
      >
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "22px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {logo ? (
              <img
                src={logo}
                width={64}
                height={64}
                style={{
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            ) : null}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {title}
              </div>
              <div style={{ fontSize: 22, opacity: 0.85 }}>{subtitle}</div>
            </div>
          </div>

          {/* Grid cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
              marginTop: "8px",
            }}
          >
            {rows.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 22px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ fontSize: 24, opacity: 0.9 }}>{k}</div>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.01em" }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: "auto", fontSize: 18, opacity: 0.7 }}>
            cjconnect2.vercel.app
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
