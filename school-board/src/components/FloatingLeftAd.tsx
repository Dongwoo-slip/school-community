"use client";

import React from "react";

type AdCfg = { show: boolean; w: number; h: number; left: number };
type AdData = {
  id: string;
  title: string | null;
  content: string | null;
  image_urls?: string[] | null;
};

const AD_CACHE_KEY = "school-floating-ad-cache:v2";
const AD_CACHE_TTL_MS = 5 * 60 * 1000;

function getAdCfg(vw: number): AdCfg {
  const contentWidth = 1152;
  const gutter = Math.max(0, (vw - contentWidth) / 2);

  if (vw < 1280 || gutter < 56) return { show: false, w: 0, h: 0, left: 0 };

  const w = vw < 1440 ? 52 : vw < 1700 ? 120 : 150;
  const h = vw < 1440 ? 240 : vw < 1700 ? 390 : 450;
  const left = Math.max(6, Math.floor(gutter - w - 8));
  return { show: true, w, h, left };
}

/**
 * ✅ SSR/CSR 불일치(하이드레이션) 방지:
 * - 서버에서는 null
 * - 클라 마운트 이후에만 광고 렌더
 */
export default function FloatingLeftAd({ topAnchorId }: { topAnchorId: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [cfg, setCfg] = React.useState<AdCfg>({ show: false, w: 0, h: 0, left: 0 });
  const [topPx, setTopPx] = React.useState(180);
  const [ad, setAd] = React.useState<AdData | null>(null);

  React.useEffect(() => {
    setMounted(true);

    const calc = () => {
      const next = getAdCfg(window.innerWidth);
      setCfg(next);

      const anchor = document.getElementById(topAnchorId);
      if (!anchor) {
        setTopPx(180);
        return;
      }
      const r = anchor.getBoundingClientRect();
      const anchorBottom = Math.round(r.bottom) + 8;
      setTopPx(Math.max(120, anchorBottom));
    };

    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, { passive: true });

    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc);
    };
  }, [topAnchorId]);

  React.useEffect(() => {
    let alive = true;
    async function loadAd() {
      if (!cfg.show) {
        setAd(null);
        return;
      }

      try {
        const cached = JSON.parse(window.sessionStorage.getItem(AD_CACHE_KEY) || "null");
        if (cached?.expiresAt > Date.now() && cached?.data?.id) {
          if (alive) setAd(cached.data ?? null);
          return;
        }
      } catch {
        window.sessionStorage.removeItem(AD_CACHE_KEY);
      }

      const res = await fetch("/api/ad", { cache: "force-cache" }).catch(() => null);
      const json = await res?.json().catch(() => ({}));
      if (!alive) return;
      const next = json?.data ?? null;
      if (next?.id) {
        try {
          window.sessionStorage.setItem(
            AD_CACHE_KEY,
            JSON.stringify({ data: next, expiresAt: Date.now() + AD_CACHE_TTL_MS })
          );
        } catch {
          // Storage is best-effort; the ad can still render without it.
        }
      }
      setAd(next);
    }
    loadAd();
    return () => {
      alive = false;
    };
  }, [cfg.show]);

  if (!mounted) return null;
  if (!cfg.show) return null;

  const image = Array.isArray(ad?.image_urls) ? ad?.image_urls[0] : null;
  if (!image) return null;

  const link = String(ad?.content ?? "").trim();
  const imageNode = (
    <img src={image} alt={ad?.title ?? "광고"} className="h-full w-full object-cover" loading="lazy" decoding="async" />
  );

  return (
    <aside
      className="fixed z-40 transition-transform duration-300 ease-out will-change-transform"
      style={{ left: cfg.left, top: topPx, width: cfg.w }}
      aria-label="Floating advertisement"
    >
      <div className="overflow-hidden border border-sky-300 bg-white shadow-sm">
        <div className="border-b border-sky-200 bg-sky-50 px-2 py-2 text-center text-[11px] font-semibold text-sky-900">
          AD
        </div>

        <div>
          <div
            className="flex items-center justify-center bg-sky-50"
            style={{ height: cfg.h }}
          >
            {image && link ? (
              <a href={link} target="_blank" rel="noreferrer" className="block h-full w-full">
                {imageNode}
              </a>
            ) : imageNode}
          </div>

          <a
            href={link || "mailto:test"}
            target={link ? "_blank" : undefined}
            rel={link ? "noreferrer" : undefined}
            className="block border-t border-sky-200 bg-white px-2 py-2 text-center text-[10px] font-semibold text-sky-900 hover:bg-sky-50"
          >
            문의
          </a>
        </div>
      </div>
    </aside>
  );
}
