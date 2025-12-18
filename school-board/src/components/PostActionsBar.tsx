"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { postId: string };

type ApiState = {
  counts: { like: number; dislike: number; report: number };
  mine: { like: boolean; dislike: boolean; report: boolean };
};

export default function PostActionsBar({ postId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [counts, setCounts] = useState<ApiState["counts"]>({ like: 0, dislike: 0, report: 0 });
  const [mine, setMine] = useState<ApiState["mine"]>({ like: false, dislike: false, report: false });

  const reportLabel = useMemo(() => (mine.report ? "신고 접수됨" : "신고"), [mine.report]);

  async function refresh() {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reactions?post_id=${encodeURIComponent(postId)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setCounts(json.counts ?? { like: 0, dislike: 0, report: 0 });
        setMine(json.mine ?? { like: false, dislike: false, report: false });
      }
    } finally {
      setLoading(false);
    }
  }

  async function act(action: "like" | "dislike" | "report") {
    if (!postId) return;

    setBusy(true);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, action }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        alert("로그인이 필요합니다.");
        router.push(`/login?next=/community/free/${encodeURIComponent(postId)}`);
        return;
      }

      if (!res.ok) {
        alert(json?.error ?? `처리 실패 (HTTP ${res.status})`);
        return;
      }

      setCounts(json.counts ?? counts);
      setMine(json.mine ?? mine);

      if (action === "report" && json.toggled === "on") {
        alert("신고가 접수되었습니다.");
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  return (
    <div className="mt-4 border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => act("like")}
          className={
            "inline-flex items-center gap-1 border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60 " +
            (mine.like ? "border-sky-600 bg-sky-50 text-sky-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50")
          }
        >
          <span className="text-[14px] leading-none">👍</span>
          <span>좋아요</span>
          <span className="ml-1 text-slate-600">({counts.like})</span>
        </button>

        <button
          type="button"
          disabled={loading || busy}
          onClick={() => act("dislike")}
          className={
            "inline-flex items-center gap-1 border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60 " +
            (mine.dislike ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50")
          }
        >
          <span className="text-[14px] leading-none">👎</span>
          <span>싫어요</span>
          <span className="ml-1 text-slate-600">({counts.dislike})</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <button
          type="button"
          disabled={loading || busy || mine.report}
          onClick={() => act("report")}
          className={
            "inline-flex items-center gap-1 border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60 " +
            (mine.report ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50")
          }
        >
          <span className="text-[14px] leading-none">🚩</span>
          <span>{reportLabel}</span>
        </button>

        <div className="ml-auto text-[11px] text-slate-500">{loading ? "불러오는 중…" : busy ? "처리 중…" : ""}</div>
      </div>
    </div>
  );
}
