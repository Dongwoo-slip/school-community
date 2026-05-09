"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  title: string | null;
  content: string | null;
  image_urls?: string[] | null;
  created_at: string;
  is_deleted: boolean;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export default function AdminAdPage() {
  const [title, setTitle] = useState("왼쪽 배너 광고");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ad", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      setRows(Array.isArray(json?.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function uploadImage() {
    if (!file) return [];
    const fd = new FormData();
    fd.append("files", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "이미지 업로드 실패");
    return Array.isArray(json.urls) ? json.urls : [];
  }

  async function save() {
    if (busy) return;
    if (!file && !imageUrl.trim()) return setMsg("광고 이미지를 선택하거나 URL을 입력하세요.");
    if (link.trim() && !/^https?:\/\//.test(link.trim())) return setMsg("링크는 https:// 또는 http://로 시작해야 합니다.");

    setBusy(true);
    setMsg(null);
    try {
      const uploaded = await uploadImage();
      const image_urls = [...uploaded, imageUrl.trim()].filter(Boolean).slice(0, 1);
      const res = await fetch("/api/admin/ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), link: link.trim(), image_urls }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "저장 실패");
        return;
      }
      setTitle("왼쪽 배너 광고");
      setLink("");
      setFile(null);
      setImageUrl("");
      setFileInputKey((n) => n + 1);
      setMsg("광고 배너를 등록했습니다. 기존 활성 광고는 자동으로 꺼졌습니다.");
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function disable(id: string) {
    if (!confirm("이 광고를 끌까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ad?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        alert(json?.error ?? "비활성화 실패");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const preview = previewUrl || imageUrl.trim();

  return (
    <div className="space-y-5">
      <section className="border border-slate-300 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-[16px] font-black text-slate-950">왼쪽 광고 배너 관리</h2>
          <p className="mt-1 text-[12px] font-medium text-slate-600">
            권장 비율은 120x390 정도의 세로형입니다. 비율이 다르면 배너 칸에 맞춰 잘립니다.
          </p>
        </div>

        <div className="space-y-3">
          <input
            className="w-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-sky-500"
            placeholder="광고 이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            className="w-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <input
            className="w-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-sky-500"
            placeholder="이미지 URL 직접 입력도 가능"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <input
            className="w-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-sky-500"
            placeholder="클릭 시 이동할 링크 (선택, https://...)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          {preview ? (
            <div className="border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-black text-slate-600">배너 미리보기</div>
              <div className="w-[120px] overflow-hidden border border-sky-300 bg-white">
                <div className="border-b border-sky-200 bg-sky-50 px-2 py-2 text-center text-[11px] font-semibold text-sky-900">AD</div>
                <img src={preview} alt="광고 미리보기" className="h-[390px] w-full object-cover" />
                <div className="border-t border-sky-200 px-2 py-2 text-center text-[10px] font-semibold text-sky-900">문의</div>
              </div>
            </div>
          ) : null}
          {msg ? <div className="text-[12px] font-bold text-slate-700">{msg}</div> : null}
          <button type="button" className="btn-primary px-5 py-2.5 text-sm" onClick={save} disabled={busy}>
            {busy ? "처리 중..." : "광고 등록"}
          </button>
        </div>
      </section>

      <section className="border border-slate-300 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-[14px] font-black text-slate-950">광고 기록</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">활성 광고가 왼쪽 배너에 표시됩니다.</div>
          </div>
          <button type="button" className="border border-slate-300 px-3 py-2 text-[12px] font-bold" onClick={load} disabled={loading}>
            새로고침
          </button>
        </div>
        {loading ? (
          <div className="p-4 text-[12px] text-slate-600">불러오는 중...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-[12px] text-slate-600">등록된 광고가 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const image = Array.isArray(row.image_urls) ? row.image_urls[0] : null;
              return (
                <div key={row.id} className="flex gap-3 p-4">
                  {image ? <img src={image} alt="" className="h-24 w-10 border border-slate-200 object-cover" /> : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-black text-slate-950">{row.title}</div>
                      <span className={`px-2 py-0.5 text-[10px] font-black ${row.is_deleted ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                        {row.is_deleted ? "꺼짐" : "활성"}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-500">등록 {fmt(row.created_at)}</div>
                    {row.content ? <div className="mt-2 truncate text-[12px] text-sky-700">{row.content}</div> : null}
                  </div>
                  {!row.is_deleted ? (
                    <button type="button" className="self-start border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-black text-rose-600" onClick={() => disable(row.id)} disabled={busy}>
                      끄기
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
