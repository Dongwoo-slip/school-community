"use client";

import TimetableWidget from "@/components/TimetableWidget";
import { useEffect, useRef, useState } from "react";

function FloatingOutsideAd({ containerId }: { containerId: string }) {
  const AD_W = 125;       // ✅ 180의 5분의4(0.8배) = 144
  const AD_H = 350;
  const GAP = 14;
  const TOP_MIN = 170;

  const [pos, setPos] = useState<{ left: number; top: number; visible: boolean }>({
    left: 8,
    top: TOP_MIN,
    visible: true,
  });

  const [scrolling, setScrolling] = useState(false);
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      const container = document.getElementById(containerId);
      if (!container) {
        setPos((p) => ({ ...p, visible: false }));
        return;
      }

      const rect = container.getBoundingClientRect();
      const idealLeft = Math.round(rect.left - AD_W - GAP);
      const left = Math.max(8, idealLeft);

      const top = TOP_MIN;
      const visible = window.innerWidth >= 980;

      setPos({ left, top, visible });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [containerId]);

  useEffect(() => {
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
  }, []);

  if (!pos.visible) return null;

  return (
    <aside
      className={[
        "fixed z-50",
        "transition-transform duration-300 ease-out",
        "will-change-transform",
        scrolling ? "translate-y-[4px]" : "translate-y-0",
      ].join(" ")}
      style={{ left: pos.left, top: pos.top, width: AD_W }}
      aria-label="Floating advertisement"
    >
      <div className="border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-900 text-center">
          AD
        </div>

        <div className="p-3">
          <div
            className="flex items-center justify-center border-2 border-dashed border-slate-300 bg-slate-100"
            style={{ height: AD_H }}
          >
            <div className="text-center">
              <div className="text-[12px] font-bold text-slate-800">광고</div>
              <div className="mt-1 text-[11px] text-slate-600">
                {AD_W}×{AD_H}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                배너 자리
              </div>
            </div>
          </div>

          <a
            href="mailto:test"
            className="mt-2 block border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-900 hover:bg-slate-50 text-center"
          >
            광고 문의
          </a>
        </div>
      </div>
    </aside>
  );
}

export default function MainBoardClient() {
  const containerId = "main-content-container";

  return (
    <>
      <FloatingOutsideAd containerId={containerId} />

      <div
        id={containerId}
        className="
          mx-auto
          max-w-[960px]
          xl:translate-x-[70px]
        "
      >
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
                  테스트 운영 중 · 오류/건의는 아래 이메일로 문의 바랍니다.
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

        <div className="flex items-start justify-start">
          <TimetableWidget />
        </div>
      </div>
    </>
  );
}
