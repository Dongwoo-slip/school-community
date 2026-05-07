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

      setMsg("✅ 전송 완료");
      setContent("");
    } finally {
      setBusy(false);
    }
  }

  if (me.role !== "admin") {
    return (
      <div className="border border-slate-300 bg-white p-4 text-[12px] text-slate-700">
        관리자만 접근할 수 있습니다.
        <div className="mt-2">
          <Link href="/community/free" className="text-sky-700 underline underline-offset-2">
            ← 메인으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-300 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-extrabold text-slate-900">🛠 관리자 DM 센터</div>
        <Link href="/community/free" className="text-[12px] text-sky-700 underline underline-offset-2">
          메인
        </Link>
      </div>

      <div className="mt-2 text-[12px] text-slate-600">
        이제 <span className="font-semibold">게시글ID/uuid 필요 없이</span> username만 입력해서 보낼 수 있어요.
      </div>

      <div className="mt-4 space-y-2">
        <div>
          <div className="text-[12px] font-semibold text-slate-800 mb-1">받는 사람(username)</div>
          <input
            value={toUsername}
            onChange={(e) => setToUsername(e.target.value)}
            placeholder="예: wise_owl"
            className="w-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
          />
        </div>

        <div>
          <div className="text-[12px] font-semibold text-slate-800 mb-1">내용</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="쪽지 내용…"
            rows={5}
            className="w-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
          />
        </div>

        {msg ? <div className="text-[12px] text-slate-700 whitespace-pre-wrap">{msg}</div> : null}

        <button
          type="button"
          onClick={send}
          disabled={busy}
          className="border border-sky-700 bg-sky-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {busy ? "전송 중…" : "전송"}
        </button>
      </div>
    </div>
  );
}
