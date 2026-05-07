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
    <div className="mt-8 overflow-hidden rounded-2xl glass border-0">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => act("like")}
          className={
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all disabled:opacity-50 " +
            (mine.like
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white")
          }
        >
          <span className="text-sm">👍</span>
          <span>좋아요</span>
          <span className={mine.like ? "text-white/80" : "text-sky-400"}>{counts.like}</span>
        </button>

        <button
          type="button"
          disabled={loading || busy}
          onClick={() => act("dislike")}
          className={
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all disabled:opacity-50 " +
            (mine.dislike
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white")
          }
        >
          <span className="text-sm">👎</span>
          <span>싫어요</span>
          <span className={mine.dislike ? "text-white/80" : "text-rose-400"}>{counts.dislike}</span>
        </button>

        <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />

        <button
          type="button"
          disabled={loading || busy || mine.report}
          onClick={() => act("report")}
          className={
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all disabled:opacity-50 " +
            (mine.report
              ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
              : "bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400")
          }
        >
          <span className="text-sm">🚩</span>
          <span>{reportLabel}</span>
        </button>

        <div className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-600">
          {loading ? "Syncing..." : busy ? "Sending..." : ""}
        </div>
      </div>
    </div>
  );
}
