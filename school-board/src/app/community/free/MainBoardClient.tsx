"use client";

import TimetableWidget from "@/components/TimetableWidget";
import { useEffect, useMemo, useRef, useState } from "react";

type AdCfg = {
  show: boolean;
  w: number;
  h: number;
  left: number;
};

function getAdCfg(vw: number): AdCfg {
  // 모바일/작은 화면: 숨김
  if (vw < 900) return { show: false, w: 0, h: 0, left: 0 };

  // 아이패드 가로(대략): 더 작게
  if (vw < 1200) return { show: true, w: 110, h: 240, left: 12 };

  // 데스크탑
  return { show: true, w: 150, h: 300, left: 12 };
}

function FloatingLeftAd({ topAnchorId }: { topAnchorId: string }) {
  const TOP_LOCK = 220; // ✅ "탭바 아래" 최소 top

  // ✅ 핵심: SSR/CSR 첫 렌더를 동일하게 만들기 위해 mounted 전엔 무조건 null
  const [mounted, setMounted] = useState(false);

  const [cfg, setCfg] = useState<AdCfg>({ show: false, w: 0, h: 0, left: 12 });
  const [topPx, setTopPx] = useState<number>(TOP_LOCK);

  const [scrolling, setScrolling] = useState(false);
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const calc = () => {
      const next = getAdCfg(window.innerWidth);
      setCfg(next);

      const anchor = document.getElementById(topAnchorId);
      if (!anchor) {
        setTopPx(TOP_LOCK);
        return;
      }

      const r = anchor.getBoundingClientRect();
      const anchorBottom = Math.round(r.bottom) + 8;
      setTopPx(Math.max(TOP_LOCK, anchorBottom));
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [mounted, topAnchorId]);

  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      setScrolling(true);
      if (tRef.current) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(() => setScrolling(false), 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, [mounted]);

  // ✅ mounted 전엔 무조건 null → hydration mismatch 방지
  if (!mounted || !cfg.show) return null;

  return (
    <aside
      className={[
        "fixed z-50",
        "transition-transform duration-300 ease-out",
        "will-change-transform",
        scrolling ? "translate-y-[4px]" : "translate-y-0",
      ].join(" ")}
      style={{
        left: cfg.left,
        top: topPx,
        width: cfg.w,
      }}
      aria-label="Floating advertisement"
    >
      <div className="border border-slate-300 bg-white shadow-sm">
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
              <div className="mt-2 text-[10px] text-slate-500 leading-tight">
                배너 자리
              </div>
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

export default function MainBoardClient() {
  const topAnchorId = useMemo(() => "ad-top-anchor", []);

  return (
    <>
      {/* ✅ 1) anchor를 먼저 렌더(서버/클라 동일한 첫 DOM 유지) */}
      <div id={topAnchorId} />

      {/* ✅ 2) 광고는 mounted 이후에만 렌더 */}
      <FloatingLeftAd topAnchorId={topAnchorId} />

      {/* ✅ 본문: 기존보다 30px만 이동 */}
      <div className="mx-auto max-w-[940px] lg:ml-[30px] lg:mr-auto">
        {/* 배너 */}
        <div className="mb-4 border-y-2 border-sky-700 bg-white">
          <div className="border-b border-sky-700 bg-sky-50 px-4 py-2 text-[12px] font-semibold text-sky-900">
            CheongJu High School Community - Sqaure
          </div>

          <div className="px-5 py-3 sm:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900">
                  청주고 학생 커뮤니티 Square
                </div>
                <div className="mt-1 text-[12px] text-slate-600">
                  테스트 운영 중 · 오류/건의는 아래 이메일로 알려줘!
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="mailto:test"
                  className="border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-900 hover:bg-slate-50"
                >
                  문의 메일
                </a>

                <button
                  type="button"
                  className="border border-sky-100 bg-sky-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-sky-600"
                >
                  공지 보기 (자리)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 시간표 */}
        <div className="flex items-start justify-start">
          <TimetableWidget />
        </div>
      </div>
    </>
  );
}
