"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  title: string | null;
  content: string | null;
  image_urls?: string[] | null;
  tags?: string[] | null;
  author_username?: string | null;
  created_at: string;
  updated_at?: string | null;
  is_deleted: boolean;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export default function AdminPopupPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [layout, setLayout] = useState<"portrait" | "split">("portrait");
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
      const res = await fetch("/api/admin/popup", { cache: "no-store", credentials: "include" });
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
    if (title.trim().length < 1) return setMsg("제목을 입력하세요.");
    if (content.trim().length < 1 && !file && !imageUrl.trim()) return setMsg("텍스트 또는 이미지를 하나 이상 넣어주세요.");

    setBusy(true);
    setMsg(null);
    try {
      const uploadedUrls = await uploadImage();
      const directImageUrl = imageUrl.trim();
      const image_urls = [...uploadedUrls, directImageUrl].filter(Boolean).slice(0, 3);
      const res = await fetch("/api/admin/popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), content: content.trim(), image_urls, layout }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "저장 실패");
        return;
      }
      setTitle("");
      setContent("");
      setLayout("portrait");
      setFile(null);
      setImageUrl("");
      setFileInputKey((n) => n + 1);
      setMsg("팝업 공지를 등록했습니다. 기존 활성 팝업은 자동으로 꺼졌습니다.");
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function disable(id: string) {
    if (!confirm("이 팝업을 끌까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/popup?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
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

  return (
    <div className="space-y-5">
      <section className="border border-slate-300 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-[16px] font-black text-slate-950">팝업 공지 관리</h2>
          <p className="mt-1 text-[12px] font-medium text-slate-600">팝업 모양을 선택해서 등록할 수 있습니다. 텍스트가 길면 본문 박스가 늘어납니다.</p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setLayout("portrait")}
              className={`border px-3 py-3 text-left text-[12px] font-black ${layout === "portrait" ? "border-sky-600 bg-sky-50 text-sky-800" : "border-slate-300 bg-white text-slate-700"}`}
            >
              세로형
              <span className="mt-1 block text-[11px] font-medium text-slate-500">위 사진, 아래 제목/내용</span>
            </button>
            <button
              type="button"
              onClick={() => setLayout("split")}
              className={`border px-3 py-3 text-left text-[12px] font-black ${layout === "split" ? "border-sky-600 bg-sky-50 text-sky-800" : "border-slate-300 bg-white text-slate-700"}`}
            >
              가로형
              <span className="mt-1 block text-[11px] font-medium text-slate-500">왼쪽 사진, 오른쪽 제목/내용</span>
            </button>
          </div>
          <input
            className="w-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-sky-500"
            placeholder="팝업 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="min-h-[150px] w-full border border-slate-300 px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-500"
            placeholder="팝업에 같이 보여줄 텍스트"
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
          {(previewUrl || imageUrl.trim()) ? (
            <div className="border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-black text-slate-600">이미지 미리보기</div>
              <img
                src={previewUrl || imageUrl.trim()}
                alt="팝업 이미지 미리보기"
                className="aspect-square w-full border border-slate-200 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : null}
          {msg ? <div className="text-[12px] font-bold text-slate-700">{msg}</div> : null}
          <button type="button" className="btn-primary px-5 py-2.5 text-sm" onClick={save} disabled={busy}>
            {busy ? "처리 중..." : "팝업 등록"}
          </button>
        </div>
      </section>

      <section className="border border-slate-300 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-[14px] font-black text-slate-950">팝업 기록</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">활성 팝업이 맨 위에 표시됩니다.</div>
          </div>
          <button type="button" className="border border-slate-300 px-3 py-2 text-[12px] font-bold" onClick={load} disabled={loading}>
            새로고침
          </button>
        </div>
        {loading ? (
          <div className="p-4 text-[12px] text-slate-600">불러오는 중...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-[12px] text-slate-600">등록된 팝업이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const image = Array.isArray(row.image_urls) ? row.image_urls[0] : null;
              const isSplit = Array.isArray(row.tags) && row.tags.includes("popup:layout:split");
              return (
                <div key={row.id} className="flex gap-3 p-4">
                  {image ? <img src={image} alt="" className="h-20 w-20 border border-slate-200 object-cover" /> : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-black text-slate-950">{row.title}</div>
                      <span className={`px-2 py-0.5 text-[10px] font-black ${row.is_deleted ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                        {row.is_deleted ? "꺼짐" : "활성"}
                      </span>
                      <span className="bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
                        {isSplit ? "가로형" : "세로형"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
                      <span>등록 {fmt(row.created_at)}</span>
                      <span>작성자 {row.author_username ?? "알수없음"}</span>
                    </div>
                    <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-[12px] text-slate-700">{row.content}</div>
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
