"use client";

import { useState } from "react";
import Link from "next/link";
import { useFreeBoard } from "../../layout";

export default function DmPageClient() {
  const { me } = useFreeBoard();

  const [toUsername, setToUsername] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    const u = toUsername.trim();
    const c = content.trim();

    if (!u) return setMsg("받는 사람 username을 입력하세요.");
    if (!c) return setMsg("내용을 입력하세요.");

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_username: u, // ✅ 핵심
          content: c,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(json?.error ?? "전송 실패");
        return;
      }

      setMsg("전송 완료");
      setContent("");
    } finally {
      setBusy(false);
    }
  }

  if (me.role !== "admin") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
        관리자만 접근할 수 있습니다.
        <div className="mt-2">
          <Link href="/community/free" className="text-xs font-semibold text-sky-700 hover:underline">
            메인으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div>
          <div className="text-base font-semibold text-slate-950">관리자 쪽지 보내기</div>
          <div className="mt-1 text-xs font-medium text-slate-500">username만 입력해서 보낼 수 있어요.</div>
        </div>
        <Link href="/community/free" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
          메인
        </Link>
      </div>

      <div className="space-y-3 bg-slate-50 px-4 py-4">
        <div>
          <div className="mb-1 text-[12px] font-semibold text-slate-700">받는 사람 username</div>
          <input
            value={toUsername}
            onChange={(e) => setToUsername(e.target.value)}
            placeholder="예: wise_owl"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
          />
        </div>

        <div>
          <div className="mb-1 text-[12px] font-semibold text-slate-700">내용</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="쪽지 내용…"
            rows={5}
            className="min-h-[130px] w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-900 outline-none"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          {msg ? <div className="whitespace-pre-wrap text-[12px] font-medium text-slate-700">{msg}</div> : <div />}
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="btn-primary px-4 py-2 text-[12px] disabled:opacity-60"
          >
            {busy ? "전송 중..." : "전송"}
          </button>
        </div>
      </div>
    </div>
  );
}
