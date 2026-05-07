"use client";

import { useState } from "react";

export default function AdminDmButton({
  recipientUsername,
  recipientName,
}: {
  recipientUsername: string; // ✅ username으로 보낼거라 이 값이 핵심
  recipientName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const content = text.trim();
    if (!content) return;

    setBusy(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // ✅ 핵심: to에 username을 넣어야 함
        body: JSON.stringify({ to: recipientUsername, content }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "쪽지 전송 실패");
        return;
      }

      setText("");
      setOpen(false);
      alert("쪽지 전송 완료");
    } finally {
      setBusy(false);
    }
  }

  // username이 비어있으면 버튼 자체를 숨김(오작동 방지)
  if (!recipientUsername?.trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-emerald-400 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
        title="관리자 쪽지 보내기"
      >
        ✉ 쪽지
      </button>

      {open ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[520px] border border-slate-300 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="text-[13px] font-extrabold text-slate-900">
                관리자 쪽지 보내기
                <div className="mt-0.5 text-[11px] font-normal text-slate-500">
                  대상: <span className="font-semibold text-slate-900">{recipientName ?? recipientUsername}</span>{" "}
                  <span className="text-slate-400">(@{recipientUsername})</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <div className="px-4 py-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
                rows={6}
                placeholder="쪽지 내용을 입력하세요…"
              />

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={busy || text.trim().length === 0}
                  className="border border-emerald-700 bg-emerald-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  전송
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
