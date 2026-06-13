"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFreeBoard } from "../../layout";

export default function DmCenterClient() {
  const { me } = useFreeBoard();
  const sp = useSearchParams();

  // ?to=username 형태로 미리 채워주기
  const presetTo = useMemo(() => (sp.get("to") ?? "").trim(), [sp]);
  const presetPost = useMemo(() => (sp.get("post") ?? "").trim(), [sp]);

  const [to, setTo] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (presetTo) setTo(presetTo);
  }, [presetTo]);

  async function send() {
    const toTrim = to.trim();
    const msg = content.trim();

    if (!toTrim) return setMsg("받는 사람 아이디를 입력하세요.");
    if (!msg) return setMsg("쪽지 내용을 입력하세요.");

    setBusy(true);
    setMsg(null);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(toTrim);
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isUuid ? { receiver_id: toTrim } : { to: toTrim }),
          content: msg,
          post: presetPost || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "전송 실패");
        return;
      }

      setContent("");
      setMsg(`${json?.username ? `${json.username}에게 ` : ""}쪽지를 보냈습니다.`);
    } finally {
      setBusy(false);
    }
  }

  if (me.role !== "admin") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
        관리자만 접근할 수 있습니다.
        <div className="mt-3">
          <Link href="/community/free" className="text-xs font-semibold text-sky-700 hover:underline">
            메인으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="px-4 py-4">
          <div className="text-base font-semibold text-slate-950">관리자 쪽지 보내기</div>
          <div className="mt-1 text-xs font-medium text-slate-500">아이디(username) 또는 user UUID로 학생에게 쪽지를 보냅니다.</div>
          {presetPost ? (
            <div className="mt-0.5 text-[11px] text-slate-500">
              참고 게시글: <span className="font-semibold">{presetPost}</span>
            </div>
          ) : null}
        </div>

        <Link
          href="/community/free"
          className="mr-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          메인
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50 px-4 py-4">
        <div>
          <div className="mb-1 text-[12px] font-semibold text-slate-700">받는 사람 아이디</div>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
            placeholder="예: student01 또는 user UUID"
          />
        </div>

        <div>
          <div className="mb-1 text-[12px] font-semibold text-slate-700">내용</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-900 outline-none"
            rows={7}
            placeholder="쪽지 내용 입력…"
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
