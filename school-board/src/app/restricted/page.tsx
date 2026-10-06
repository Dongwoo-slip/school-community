"use client";

import { useEffect, useState } from "react";
import { SquareLogoLockup } from "@/components/SquareLogo";

const MENU_ITEMS = [
  "메인",
  "게시글",
  "학생회 소통",
  "구인구직",
  "급식표",
  "마감캘린더",
  "베스트",
];

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex-1 rounded border border-slate-200 bg-white px-4 py-3 text-center">
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black text-slate-950">
        {value === null ? "-" : value.toLocaleString("ko-KR")}
      </div>
    </div>
  );
}

export default function RestrictedPage() {
  const [members, setMembers] = useState<number | null>(null);
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      const [memberResponse, visitorResponse] = await Promise.all([
        fetch("/api/stats/users", { cache: "no-store", credentials: "include" }),
        fetch("/api/stats/visitors", { method: "POST", credentials: "include" }),
      ]);
      const [memberJson, visitorJson] = await Promise.all([
        memberResponse.json().catch(() => ({})),
        visitorResponse.json().catch(() => ({})),
      ]);

      if (!active) return;
      if (typeof memberJson?.count === "number") setMembers(memberJson.count);
      if (typeof visitorJson?.count === "number") setVisitors(visitorJson.count);
    }

    void loadStats().catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <SquareLogoLockup markSize={34} compact />
            <span className="text-[11px] font-bold text-slate-400">청주고등학교 커뮤니티</span>
          </div>

          <nav className="flex items-center overflow-x-auto border-t border-slate-100" aria-label="비활성화된 상단 메뉴">
            {MENU_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                disabled
                aria-disabled="true"
                className="cursor-not-allowed whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13px] font-semibold text-slate-400"
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-md gap-3">
          <StatCard label="회원" value={members} />
          <StatCard label="조회수" value={visitors} />
        </div>

        <section className="mx-auto mt-6 max-w-3xl rounded border border-slate-200 bg-white px-6 py-20 text-center shadow-sm sm:mt-8 sm:px-10 sm:py-28">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">Access Restricted</div>
          <p className="mx-auto mt-5 max-w-xl break-keep text-base font-bold leading-8 text-slate-700 sm:text-lg">
            학교 외부 IP로는 접근 하실수없습니다.
            <br />
            <span className="text-sm font-semibold text-slate-500 sm:text-base">
              (학번이 인증된ID 또는 허용된 IP에서만 접근 가능합니다)
            </span>
          </p>
        </section>
      </main>
    </div>
  );
}
