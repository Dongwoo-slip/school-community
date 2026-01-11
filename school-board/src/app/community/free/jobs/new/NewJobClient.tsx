"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const TAGS = [
  "물리","화학","생명과학","지구과학",
  "수학","컴공","AI/데이터","로봇",
  "사회","경제","의료보건","교사/교육",
  "디자인","영상","음악","미술","체육",
  "대회/공모전","스터디","프로젝트","봉사",
];

function Chip({ active, children, onClick }: { active: boolean; children: any; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "border px-2 py-1 text-[11px] font-semibold whitespace-nowrap " +
        (active ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50")
      }
    >
      {children}
    </button>
  );
}

export default function NewJobClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => title.trim().length >= 2 && content.trim().length >= 2 && !busy, [title, content, busy]);

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 8 ? prev : [...prev, t]));
  }

  async function submit() {
    setMsg(null);
    if (!canSubmit) return;

    setBusy(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), tags }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setMsg("로그인이 필요합니다.");
        return;
      }
      if (!res.ok) {
        setMsg(json?.error ?? "등록 실패");
        return;
      }

      const id = json?.data?.id;
      if (id) router.push(`/community/free/${encodeURIComponent(id)}`);
      else router.push("/community/free/jobs");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-slate-400 bg-white p-4">
      <div className="text-[15px] font-extrabold text-slate-900">구인구직 글쓰기</div>
      <div className="mt-1 text-[12px] text-slate-600">과제/프로젝트/스터디/대회 팀원 모집 등을 작성해줘.</div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-[12px] font-bold text-slate-900">제목</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
            placeholder="예) 물리 실험탐구 같이 할 사람 구해요"
          />
        </div>

        <div>
          <div className="text-[12px] font-bold text-slate-900">내용</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
            rows={8}
            placeholder={`- 하고 싶은 내용\n- 원하는 사람(학년/반/경험)\n- 연락 방식(쪽지 등)\n- 마감/기간`}
          />
        </div>

        <div>
          <div className="text-[12px] font-bold text-slate-900">태그(관심사) (최대 8개)</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        {msg ? <div className="text-[12px] text-rose-600">{msg}</div> : null}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="border border-sky-700 bg-sky-700 px-4 py-2 text-[12px] font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {busy ? "등록 중…" : "등록"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/community/free/jobs")}
            className="border border-slate-300 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            disabled={busy}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
