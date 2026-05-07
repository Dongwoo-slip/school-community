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
    <div className="border border-slate-300 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-extrabold text-slate-900">🛠 관리자 DM 센터</div>
        <Link href="/community/free/messages" className="text-[12px] text-sky-700 hover:underline">
          쪽지함 →
        </Link>
      </div>

      <div className="mt-2 text-[12px] text-slate-600">
        보내려면 <b>recipient_id</b>(상대 user id)가 필요해.
        <div className="mt-1 text-[11px] text-slate-500">
          가장 쉬운 방법: <b>게시글 상세 페이지에서 작성자(author_id)</b>를 이용해서 이 페이지로 이동시키는 방식.
          (아래에 버튼 붙이는 방법은 내가 다음 단계에서 “상세 페이지 전체코드” 받으면 거기에 바로 넣어줄게)
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <label className="text-[12px] font-semibold text-slate-700">recipient_id</label>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border border-slate-300 px-3 py-2 text-[12px]"
          placeholder="예: 123e4567-e89b-12d3-a456-426614174000"
        />

        <label className="mt-2 text-[12px] font-semibold text-slate-700">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border border-slate-300 px-3 py-2 text-[12px] min-h-[120px]"
          placeholder="쪽지 내용"
        />

        <button
          type="button"
          onClick={send}
          disabled={busy || me.role !== "admin"}
          className="mt-2 border border-emerald-600 bg-emerald-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
