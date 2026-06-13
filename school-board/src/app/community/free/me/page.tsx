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
  studentVerified?: boolean;
  studentNo?: string | null;
  verifiedGrade?: number | null;
  verifiedClassNo?: number | null;
  studentVerifiedAt?: string | null;
};

type VerificationPreview = {
  studentNo?: string | null;
};

export default function MyInfoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [me, setMe] = useState<MeRes | null>(null);
  const [grade, setGrade] = useState<number>(2);
  const [classNo, setClassNo] = useState<number>(7);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationPreview, setVerificationPreview] = useState<VerificationPreview | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);

  async function loadMe() {
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
  }

  useEffect(() => {
    void loadMe();
  }, []);

  async function checkVerificationCode() {
    setVerificationMsg(null);
    setVerificationPreview(null);

    const code = verificationCode.trim();
    if (!code) {
      setVerificationMsg("인증코드를 입력해 주세요.");
      return;
    }

    setVerificationLoading(true);
    try {
      const res = await fetch("/api/student-verification/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerificationMsg(json?.error ?? "인증코드를 확인하지 못했습니다.");
        return;
      }

      const preview = {
        studentNo: json.studentNo ? String(json.studentNo) : null,
      };
      setVerificationPreview(preview);
      setVerificationMsg("학번을 확인한 뒤 맞으면 인증하기를 눌러 주세요.");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function onClaimVerification() {
    setVerificationMsg(null);

    const code = verificationCode.trim();
    if (!code) {
      setVerificationMsg("인증코드를 입력해 주세요.");
      return;
    }
    if (!verificationPreview) {
      setVerificationMsg("먼저 인증코드 확인을 눌러 학번을 확인해 주세요.");
      return;
    }

    setVerificationSaving(true);
    try {
      const res = await fetch("/api/student-verification/claim", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerificationMsg(json?.error ?? "인증에 실패했습니다.");
        return;
      }

      const nextGrade = Number(json.grade);
      const nextClassNo = Number(json.classNo);
      setGrade(nextGrade);
      setClassNo(nextClassNo);
      setMe((prev) =>
        prev
          ? {
              ...prev,
              grade: nextGrade,
              classNo: nextClassNo,
              studentVerified: true,
              studentNo: json.studentNo ? String(json.studentNo) : verificationPreview.studentNo ?? null,
              verifiedGrade: nextGrade,
              verifiedClassNo: nextClassNo,
              studentVerifiedAt: new Date().toISOString(),
            }
          : prev
      );
      setVerificationCode("");
      setVerificationPreview(null);
      setVerificationMsg("인증이 완료됐습니다.");
      router.refresh();
    } finally {
      setVerificationSaving(false);
    }
  }

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
    <main className="mx-auto max-w-lg px-4 py-8 text-slate-900">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-normal">내 정보 수정</h1>
        <p className="mt-1 text-sm text-slate-600">학년/반과 계정 인증 상태를 관리할 수 있어요.</p>

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
                아이디: <span className="font-medium">{me.username ?? "unknown"}</span>
              </div>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">계정 인증</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600">개별 인증코드는 선택사항이고, 인증하면 계정에 학생 정보가 연결됩니다.</p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium " +
                      (me.studentVerified ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-600")
                    }
                  >
                    {me.studentVerified ? "인증됨" : "미인증"}
                  </span>
                </div>

                {me.studentVerified ? (
                  <div className="mt-3 rounded-lg border border-sky-100 bg-white p-3 text-sm leading-6 text-slate-700">
                    {me.studentNo ? (
                      <div className="font-medium text-slate-950">학번 {me.studentNo}</div>
                    ) : (
                      <div className="font-medium text-slate-950">인증된 계정입니다.</div>
                    )}
                    {me.verifiedGrade && me.verifiedClassNo ? (
                      <div className="text-xs text-slate-500">
                        시간표는 인증 정보 기준으로 자동 설정됩니다.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600">개별 인증코드</label>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
                          placeholder="인증코드"
                          value={verificationCode}
                          onChange={(e) => {
                            setVerificationCode(e.target.value);
                            setVerificationPreview(null);
                            setVerificationMsg(null);
                          }}
                          disabled={verificationLoading || verificationSaving}
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                          onClick={checkVerificationCode}
                          disabled={verificationLoading || verificationSaving}
                        >
                          {verificationLoading ? "확인 중" : "확인"}
                        </button>
                      </div>
                    </div>

                    {verificationPreview ? (
                      <div className="rounded-lg border border-sky-100 bg-white p-3 text-sm leading-6 text-slate-700">
                        <div className="font-medium text-slate-950">
                          학번 {verificationPreview.studentNo ?? "학번 정보 없음"}
                        </div>
                        <button
                          type="button"
                          className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                          onClick={onClaimVerification}
                          disabled={verificationSaving}
                        >
                          {verificationSaving ? "인증 중..." : "이 학번으로 인증하기"}
                        </button>
                      </div>
                    ) : null}

                    {verificationMsg ? (
                      <div
                        className={
                          "text-xs leading-5 " +
                          (verificationMsg.includes("완료")
                            ? "text-emerald-700"
                            : verificationMsg.includes("학번을 확인")
                              ? "text-slate-600"
                              : "text-rose-600")
                        }
                      >
                        {verificationMsg}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">학년</label>
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
                  <label className="text-sm font-medium text-slate-700">반</label>
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
                className="w-full rounded-lg bg-sky-600 p-2.5 font-medium text-white hover:bg-sky-500 disabled:opacity-60"
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
