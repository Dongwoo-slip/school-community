"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@school-board.test`;
}

export default function SignupPage() {
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // ✅ 학년/반 (기본값: 2학년 7반)
  const [grade, setGrade] = useState<number>(2);
  const [classNo, setClassNo] = useState<number>(7);

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignup() {
    setMsg(null);

    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return setMsg("아이디는 영문/숫자/_ 만 가능 (3~20자)");
    if (password.length < 6) return setMsg("비밀번호는 6글자 이상");
    if (password !== password2) return setMsg("비밀번호가 일치하지 않습니다.");

    if (!(grade >= 1 && grade <= 3)) return setMsg("학년은 1~3만 가능합니다.");
    if (!(classNo >= 1 && classNo <= 11)) return setMsg("반은 1~11만 가능합니다.");

    setLoading(true);
    try {
      // ✅ 1) 회원가입 + 메타데이터에 학년/반 저장(혹시 트리거가 쓰는 경우 대비)
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: toEmail(u),
        password,
        options: {
          data: {
            username: u,
            grade,
            class_no: classNo,
          },
        },
      });

      if (error) return setMsg(error.message);

      // ✅ 2) 세션이 없는 환경(이메일 인증 켠 경우) 대비: 로그인 시도
      //    - 세션이 생기면 profiles 업데이트를 바로 해줌
      const ensureSession = async () => {
        // signUpData.session이 있으면 그대로 OK
        if (signUpData?.session) return signUpData.session;

        // 없으면 로그인 시도
        const { data: si, error: se } = await supabase.auth.signInWithPassword({
          email: toEmail(u),
          password,
        });

        if (se) return null;
        return si.session ?? null;
      };

      const session = await ensureSession();

      // ✅ 3) profiles에 학년/반 반영 (서버 API 우선 -> 실패 시 클라 직접 업데이트)
      //    - 서버 API는 쿠키 기반이면 가장 깔끔
      const tryServerPatch = async () => {
        const res = await fetch("/api/me/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade, classNo }),
        });
        const json = await res.json().catch(() => ({}));
        return res.ok && json?.ok;
      };

      const tryClientUpdate = async () => {
        if (!session?.user?.id) return false;

        // profiles 행이 이미 존재한다는 전제(대부분 트리거로 생성)
        const { error: ue } = await supabase
          .from("profiles")
          .update({ grade, class_no: classNo })
          .eq("id", session.user.id);

        return !ue;
      };

      const ok1 = await tryServerPatch();
      if (!ok1) await tryClientUpdate();

      // ✅ 가입 후 이동
      const params = new URLSearchParams(location.search);
      const next = params.get("next") ?? "/community/free";
      location.href = next;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold">회원가입</h1>
        <p className="mt-1 text-sm text-slate-600">아이디/비밀번호로 가입합니다.</p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">아이디</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="영문/숫자/_ (3~20자)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          {/* ✅ 학년/반 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">학년</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
              >
                {[1, 2, 3].map((g) => (
                  <option key={g} value={g}>
                    {g}학년
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">반</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
                value={classNo}
                onChange={(e) => setClassNo(Number(e.target.value))}
              >
                {Array.from({ length: 11 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    {c}반
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">비밀번호</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="6글자 이상"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">비밀번호 확인</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="한 번 더 입력"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button className="mt-2 w-full rounded-lg bg-sky-600 p-2.5 font-bold text-white hover:bg-sky-500 disabled:opacity-60" onClick={onSignup} disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </button>

          <div className="flex gap-2 pt-1">
            <a className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm hover:bg-slate-50" href="/login">
              로그인
            </a>
            <a className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm hover:bg-slate-50" href="/community/free">
              홈으로
            </a>
          </div>

          {msg && <div className="text-sm text-rose-600">{msg}</div>}
        </div>
      </div>
    </main>
  );
}
