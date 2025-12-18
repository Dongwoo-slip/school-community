"use client";

import { useFreeBoard } from "../layout";

function StatCard({ title, value }: { title: string; value: number | null }) {
  return (
    <div className="border border-slate-300 bg-white p-4">
      <div className="text-[12px] font-semibold text-slate-700">{title}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-900">
        {value === null ? "-" : value.toLocaleString()}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { members, visitors } = useFreeBoard();

  return (
    <>
      <div className="mb-3 text-[13px] font-semibold text-slate-800">통계</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard title="누적 회원 수" value={members} />
        <StatCard title="누적 방문수" value={visitors} />
      </div>
    </>
  );
}
