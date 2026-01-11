"use client";

import React from "react";

type AdCfg = { show: boolean; w: number; h: number; left: number };

function getAdCfg(vw: number): AdCfg {
  // 너무 좁으면 겹치니까 숨김 (아이패드 가로 포함)
  if (vw < 1400) return { show: false, w: 0, h: 0, left: 0 };

  // 중간 데스크탑
  if (vw < 1700) return { show: true, w: 160, h: 260, left: 12 };

  // 큰 데스크탑
  return { show: true, w: 190, h: 300, left: 12 };
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

  if (!mounted) return null;
  if (!cfg.show) return null;

  return (
    <aside
      className="fixed z-50 transition-transform duration-300 ease-out will-change-transform"
      style={{ left: cfg.left, top: topPx, width: cfg.w }}
      aria-label="Floating advertisement"
    >
      <div className="border border-slate-300 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-900 text-center">
          AD
        </div>

        <div className="p-2">
          <div
            className="flex items-center justify-center border-2 border-dashed border-slate-300 bg-slate-100"
            style={{ height: cfg.h }}
          >
            <div className="text-center">
              <div className="text-[11px] font-bold text-slate-800">광고</div>
              <div className="mt-1 text-[10px] text-slate-600">
                {cfg.w}×{cfg.h}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 leading-tight">배너 자리</div>
            </div>
          </div>

          <a
            href="mailto:test"
            className="mt-2 block border border-slate-200 bg-white px-2 py-2 text-[10px] font-semibold text-slate-900 hover:bg-slate-50 text-center"
          >
            문의
          </a>
        </div>
      </div>
    </aside>
  );
}
