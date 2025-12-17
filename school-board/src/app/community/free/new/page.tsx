"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PollDraft = { enabled: boolean; question: string; options: string[] };

function keyOfFile(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

export default function NewFreePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [poll, setPoll] = useState<PollDraft>({
    enabled: false,
    question: "투표",
    options: ["", ""],
  });

  const canSubmit = useMemo(() => {
    if (title.trim().length < 2) return false;
    if (content.trim().length < 2) return false;

    if (poll.enabled) {
      const opts = poll.options.map((s) => s.trim()).filter(Boolean);
      if (opts.length < 2) return false;
    }
    return true;
  }, [title, content, poll]);

  function addFiles(picked: File[]) {
    setFiles((prev) => {
      const map = new Map<string, File>();
      [...prev, ...picked].forEach((f) => map.set(keyOfFile(f), f)); // 중복 제거
      return Array.from(map.values());
    });
  }

  function removeFile(target: File) {
    const k = keyOfFile(target);
    setFiles((prev) => prev.filter((x) => keyOfFile(x) !== k));
  }

  function clearFiles() {
    setFiles([]);
  }

  async function uploadFilesIfAny(): Promise<string[]> {
    if (files.length === 0) return [];

    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "업로드 실패");

    return Array.isArray(json.urls) ? json.urls : [];
  }

  async function onSubmit() {
    if (!canSubmit || uploading) return;

    setUploading(true);
    try {
      const image_urls = await uploadFilesIfAny();

      const body: any = {
        board: "free",
        title: title.trim(),
        content: content.trim(),
        image_urls,
      };

      if (poll.enabled) {
        body.poll = {
          question: poll.question.trim() || "투표",
          options: poll.options.map((s) => s.trim()).filter(Boolean),
        };
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "등록 실패");
        return;
      }

      router.push(`/community/free/${encodeURIComponent(json.id)}`);
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "등록 실패");
    } finally {
      setUploading(false);
    }
  }

  function addOption() {
    setPoll((p) => ({ ...p, options: [...p.options, ""] }));
  }

  function removeOption(i: number) {
    setPoll((p) => ({ ...p, options: p.options.filter((_, idx) => idx !== i) }));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xl font-extrabold text-slate-900">글쓰기</div>
        <button
          className="border border-slate-300 bg-white px-3 py-1 text-[12px] hover:bg-slate-50"
          onClick={() => router.push("/community/free")}
          type="button"
        >
          목록
        </button>
      </div>

      <div className="space-y-3 border border-slate-300 bg-white p-4">
        <input
          className="w-full border border-slate-300 bg-white p-2 text-slate-900"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border border-slate-300 bg-white p-2 text-slate-900"
          placeholder="본문"
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* ✅ 파일 업로드(여러 개 + 누적 선택) */}
        <div className="border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12px] font-semibold text-slate-800">
              사진 첨부 (파일)
            </div>

            {files.length > 0 ? (
              <button
                type="button"
                className="border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-50"
                onClick={clearFiles}
              >
                전체 삭제
              </button>
            ) : null}
          </div>

          <input
            className="mt-2 block w-full text-[12px]"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              addFiles(picked);
              // ✅ 같은 파일을 다시 선택해도 onChange가 뜨도록 리셋
              e.currentTarget.value = "";
            }}
          />

          {files.length > 0 ? (
            <div className="mt-2 space-y-2">
              <div className="text-[12px] text-slate-600">
                선택됨: {files.length}개
              </div>

              <ul className="space-y-1">
                {files.map((f) => (
                  <li
                    key={keyOfFile(f)}
                    className="flex items-center justify-between gap-2 text-[12px]"
                  >
                    <span className="min-w-0 truncate text-slate-700">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-rose-600 underline"
                      onClick={() => removeFile(f)}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>

              <div className="text-[11px] text-slate-500">
                * 파일 선택을 여러 번 눌러서 사진을 계속 추가할 수 있어요.
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[12px] text-slate-500">선택 안 함</div>
          )}
        </div>

        {/* 투표 */}
        <div className="border border-slate-200 bg-white p-3">
          <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={poll.enabled}
              onChange={(e) =>
                setPoll((p) => ({ ...p, enabled: e.target.checked }))
              }
            />
            투표 추가
          </label>

          {poll.enabled ? (
            <div className="mt-3 space-y-2">
              <input
                className="w-full border border-slate-300 bg-white p-2 text-[13px] text-slate-900"
                placeholder="투표 질문(선택)"
                value={poll.question}
                onChange={(e) =>
                  setPoll((p) => ({ ...p, question: e.target.value }))
                }
              />

              <div className="space-y-2">
                {poll.options.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 border border-slate-300 bg-white p-2 text-[13px] text-slate-900"
                      placeholder={`항목 ${i + 1}`}
                      value={v}
                      onChange={(e) =>
                        setPoll((p) => ({
                          ...p,
                          options: p.options.map((x, idx) =>
                            idx === i ? e.target.value : x
                          ),
                        }))
                      }
                    />
                    {poll.options.length > 2 ? (
                      <button
                        className="border border-slate-300 bg-white px-2 py-2 text-[12px] hover:bg-slate-50"
                        onClick={() => removeOption(i)}
                        type="button"
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <button
                className="border border-slate-300 bg-white px-3 py-2 text-[12px] hover:bg-slate-50"
                onClick={addOption}
                type="button"
              >
                + 항목 추가
              </button>

              <div className="text-[12px] text-slate-500">
                ※ 항목은 최소 2개 필요
              </div>
            </div>
          ) : null}
        </div>

        <button
          disabled={!canSubmit || uploading}
          onClick={onSubmit}
          className="w-full border border-sky-600 bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          type="button"
        >
          {uploading ? "등록 중..." : "등록"}
        </button>
      </div>
    </main>
  );
}
