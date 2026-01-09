"use client";

export default function AnonymousChatBox() {
  return (
    <div className="mt-3 border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-3 py-2">
        <div className="text-[13px] font-semibold text-slate-900">💬 익명채팅</div>
        <div className="mt-0.5 text-[11px] text-slate-500">현재 점검 중</div>
      </div>

      {/* ✅ 채팅 영역을 통째로 가림 */}
      <div className="h-[260px] px-3 py-2">
        <div className="h-full w-full flex items-center justify-center border border-slate-200 bg-slate-50">
          <div className="text-center px-4">
            <div className="text-[14px] font-bold text-slate-900">🛠️ 점검 중입니다</div>
            <div className="mt-2 text-[12px] text-slate-700 leading-relaxed">
              익명채팅 기능 안정화 작업을 진행하고 있어요.
              <br />
              잠시 후 다시 이용해 주세요 🙏
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
