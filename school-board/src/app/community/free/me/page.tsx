"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MeRes = {
  userId: string | null;
  username: string | null;
  role: string;
  grade: number | null;
  classNo: number | null;
};

export default function MyInfoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [me, setMe] = useState<MeRes | null>(null);
  const [grade, setGrade] = useState<number>(2);
  const [classNo, setClassNo] = useState<number>(7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const res = await fetch("/api/me", { cache: "no-store", credentials: "include" });
        const json: MeRes = await res.json().catch(() => ({} as any));
        setMe(json);

        if (!json?.userId) {
          setMsg("로그인이 필요합니다.");
          return;
        }

        setGrade(typeof json.grade === "number" ? json.grade : 2);
        setClassNo(typeof json.classNo === "number" ? json.classNo : 7);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, classNo }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "저장 실패");
        return;
      }

      setMsg("✅ 저장했습니다.");
      // 상단 표시(학년/반) 갱신용
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold">내 정보 수정</h1>
        <p className="mt-1 text-sm text-slate-600">학년/반을 설정하면 시간표 초기값에 반영할 수 있어요.</p>

        {loading ? (
          <div className="mt-6 text-sm text-slate-600">불러오는 중…</div>
        ) : !me?.userId ? (
          <div className="mt-6">
            <div className="text-sm text-rose-600">{msg ?? "로그인이 필요합니다."}</div>
            <div className="mt-3 flex gap-2">
              <Link className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm hover:bg-slate-50" href="/login?next=/community/free/me">
                로그인
              </Link>
              <Link className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm hover:bg-slate-50" href="/community/free">
                홈으로
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              <div className="text-sm text-slate-700">
                아이디: <span className="font-semibold">{me.username ?? "unknown"}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">학년</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    disabled={saving}
                  >
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">반</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={classNo}
                    onChange={(e) => setClassNo(Number(e.target.value))}
                    disabled={saving}
                  >
                    {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}반
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="w-full rounded-lg bg-sky-600 p-2.5 font-bold text-white hover:bg-sky-500 disabled:opacity-60"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "저장 중..." : "저장하기"}
              </button>

              {msg ? <div className={"text-sm " + (msg.startsWith("✅") ? "text-emerald-700" : "text-rose-600")}>{msg}</div> : null}

              <div className="flex gap-2 pt-1">
                <Link className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm hover:bg-slate-50" href="/community/free">
                  메인으로
                </Link>
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm hover:bg-slate-50"
                  onClick={() => router.back()}
                >
                  뒤로
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
