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

  function hideFor(hours: number) {
    if (storageKey) window.localStorage.setItem(storageKey, String(Date.now() + hours * 60 * 60 * 1000));
    setOpen(false);
  }

  if (!open || !popup) return null;

  const image = Array.isArray(popup.image_urls) ? popup.image_urls[0] : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-[440px] overflow-hidden border border-slate-200 bg-white shadow-2xl">
        {image ? (
          <div className="max-h-[55vh] overflow-hidden bg-slate-100">
            <img src={image} alt="공지 이미지" className="h-full w-full object-contain" />
          </div>
        ) : null}

        <div className="p-5">
          <div className="text-lg font-black text-slate-950">{popup.title ?? "공지사항"}</div>
          {popup.content ? (
            <div className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-700">
              {popup.content}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-3 border-t border-slate-200 text-[12px] font-black">
          <button type="button" className="border-r border-slate-200 px-2 py-3 text-slate-600 hover:bg-slate-50" onClick={() => hideFor(3)}>
            3시간 안 보기
          </button>
          <button type="button" className="border-r border-slate-200 px-2 py-3 text-slate-600 hover:bg-slate-50" onClick={() => hideFor(24)}>
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
