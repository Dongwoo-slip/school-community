"use client";

import { useState } from "react";
import Link from "next/link";
import { useFreeBoard } from "../../layout";

export default function AdminDmClient({ presetTo, presetPostId }: { presetTo: string; presetPostId: string }) {
  const { me } = useFreeBoard();
  const [to, setTo] = useState(presetTo ?? "");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (me.role !== "admin") return alert("관리자만 가능합니다.");
    const recipient_id = to.trim();
    const text = content.trim();
    if (!recipient_id) return alert("recipient_id를 입력하세요.");
    if (!text) return alert("내용을 입력하세요.");

    setBusy(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id, content: text, post_id: presetPostId || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return alert(json?.error ?? "전송 실패");

      setContent("");
      alert("쪽지를 보냈습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div>
          <div className="text-base font-semibold text-slate-950">관리자 쪽지 보내기</div>
          <div className="mt-1 text-xs font-medium text-slate-500">상대 user id로 쪽지를 보냅니다.</div>
        </div>
        <Link href="/community/free/messages" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
          쪽지함
        </Link>
      </div>

      <div className="grid gap-3 bg-slate-50 px-4 py-4">
        <label className="text-[12px] font-semibold text-slate-700">받는 사람 userId</label>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px]"
          placeholder="예: 123e4567-e89b-12d3-a456-426614174000"
        />

        <label className="text-[12px] font-semibold text-slate-700">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[130px] resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5"
          placeholder="쪽지 내용"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={send}
            disabled={busy || me.role !== "admin"}
            className="btn-primary px-4 py-2 text-[12px] disabled:opacity-60"
          >
            {busy ? "전송 중..." : "전송"}
          </button>
        </div>
      </div>
    </div>
  );
}
