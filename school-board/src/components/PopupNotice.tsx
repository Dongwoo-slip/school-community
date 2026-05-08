"use client";

import { useEffect, useMemo, useState } from "react";

type PopupPost = {
  id: string;
  title: string | null;
  content: string | null;
  image_urls?: string[] | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const STORAGE_PREFIX = "school-popup-hidden-until:";
const URL_RE = /(https?:\/\/[^\s]+)/g;

function todayEndTimestamp() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

function renderLinkedText(text: string) {
  return text.split(URL_RE).map((part, index) => {
    if (!/^https?:\/\//.test(part)) return <span key={`${part}-${index}`}>{part}</span>;
    return (
      <a
        key={`${part}-${index}`}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="font-black text-sky-700 underline decoration-sky-300 underline-offset-2"
      >
        {part}
      </a>
    );
  });
}

export default function PopupNotice() {
  const [popup, setPopup] = useState<PopupPost | null>(null);
  const [open, setOpen] = useState(false);

  const storageKey = useMemo(() => (popup?.id ? `${STORAGE_PREFIX}${popup.id}` : ""), [popup?.id]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/popup", { cache: "no-store" }).catch(() => null);
      const json = await res?.json().catch(() => ({}));
      const next = json?.data ?? null;
      if (!next?.id) return;

      const key = `${STORAGE_PREFIX}${next.id}`;
      const hiddenUntil = Number(window.localStorage.getItem(key) || "0");
      if (Number.isFinite(hiddenUntil) && hiddenUntil > Date.now()) return;

      setPopup(next);
      setOpen(true);
    }
    load();
  }, []);

  function hideUntil(timestamp: number) {
    if (storageKey) window.localStorage.setItem(storageKey, String(timestamp));
    setOpen(false);
  }

  if (!open || !popup) return null;

  const image = Array.isArray(popup.image_urls) ? popup.image_urls[0] : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <div className="flex aspect-[13/16] w-full max-w-[390px] flex-col overflow-hidden border-2 border-slate-950 bg-white shadow-2xl">
        <div className="border-b-2 border-slate-950 bg-slate-100 p-4">
          <div className="aspect-square w-full overflow-hidden border border-slate-300 bg-white">
            {image ? (
              <img src={image} alt="공지 이미지" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-black text-slate-400">
                이미지 없음
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="text-xl font-black leading-tight text-slate-950">{popup.title ?? "공지사항"}</div>
          {popup.content ? (
            <div className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-700">
              {renderLinkedText(popup.content)}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-3 border-t-2 border-slate-950 text-[12px] font-black">
          <button type="button" className="border-r border-slate-300 px-2 py-3 text-slate-600 hover:bg-slate-50" onClick={() => hideUntil(Date.now() + 3 * 60 * 60 * 1000)}>
            3시간 안 보기
          </button>
          <button type="button" className="border-r border-slate-300 px-2 py-3 text-slate-600 hover:bg-slate-50" onClick={() => hideUntil(todayEndTimestamp())}>
            오늘 안 보기
          </button>
          <button type="button" className="px-2 py-3 text-slate-950 hover:bg-slate-50" onClick={() => setOpen(false)}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
