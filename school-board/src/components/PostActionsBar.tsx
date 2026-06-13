"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { postId: string };

type ApiState = {
  counts: { like: number; dislike: number; report: number };
  mine: { like: boolean; dislike: boolean; report: boolean };
};

function ThumbIcon({ down = false, filled = false }: { down?: boolean; filled?: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ transform: down ? "rotate(180deg)" : undefined }}
    >
      <path
        d="M7.5 10.2 11.2 3.5c.5-.9 1.8-.7 2 .3l.2 1.1c.2 1.2 0 2.4-.5 3.5l-.4.9h5.2c1.2 0 2.1 1.1 1.8 2.3l-1.4 6.5c-.2.9-1 1.5-1.9 1.5H8.3c-.6 0-1.1-.5-1.1-1.1v-7.6c0-.3.1-.5.3-.7Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M3.6 10.1h3v9.5h-3a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 20V5.8c0-.7.5-1.2 1.2-1.2h10.1c.9 0 1.5.9 1.1 1.7l-1.2 2.5 1.3 2.5c.4.8-.2 1.7-1.1 1.7H6"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PostActionsBar({ postId }: Props) {
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
        alert("로그인이 필요합니다. 상단의 로그인 버튼을 눌러주세요.");
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
    <div className="post-actions-bar">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => act("like")}
          className={`post-action-button ${mine.like ? "is-active" : ""}`}
          aria-pressed={mine.like}
        >
          <ThumbIcon filled={mine.like} />
          <span>좋아요</span>
          <span>{counts.like}</span>
        </button>

        <button
          type="button"
          disabled={loading || busy}
          onClick={() => act("dislike")}
          className={`post-action-button ${mine.dislike ? "is-active" : ""}`}
          aria-pressed={mine.dislike}
        >
          <ThumbIcon down filled={mine.dislike} />
          <span>싫어요</span>
          <span>{counts.dislike}</span>
        </button>

        <button
          type="button"
          disabled={loading || busy || mine.report}
          onClick={() => act("report")}
          className={`post-action-button ${mine.report ? "is-active" : ""}`}
          aria-pressed={mine.report}
        >
          <FlagIcon filled={mine.report} />
          <span>{reportLabel}</span>
        </button>

        <div className="ml-auto text-[10px] font-medium text-slate-400">
          {loading ? "동기화 중..." : busy ? "처리 중..." : ""}
        </div>
      </div>
    </div>
  );
}
