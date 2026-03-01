"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@school-board.test`;
}

export default function SignupPage() {
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

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

      const ensureSession = async () => {
        if (signUpData?.session) return signUpData.session;
        const { data: si, error: se } = await supabase.auth.signInWithPassword({
          email: toEmail(u),
          password,
        });
        if (se) return null;
        return si.session ?? null;
      };

      const session = await ensureSession();

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
        const { error: ue } = await supabase
          .from("profiles")
          .update({ grade, class_no: classNo })
          .eq("id", session.user.id);
        return !ue;
      };

      const ok1 = await tryServerPatch();
      if (!ok1) await tryClientUpdate();

      const params = new URLSearchParams(location.search);
      const next = params.get("next") ?? "/community/free";
      location.href = next;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Abstract Background Blobs */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

      <main className="glass w-full max-w-[480px] rounded-[2.5rem] p-8 sm:p-12 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Create Account</h1>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Join Square Community</p>
        </div>

        <div className="grid gap-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
            <input
              className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
              placeholder="영문, 숫자, _ (3~20자)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Grade</label>
              <select
                className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all appearance-none cursor-pointer"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
              >
                {[1, 2, 3].map((g) => (
                  <option key={g} value={g} className="bg-slate-900">{g}학년</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Class</label>
              <select
                className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all appearance-none cursor-pointer"
                value={classNo}
                onChange={(e) => setClassNo(Number(e.target.value))}
              >
                {Array.from({ length: 11 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c} className="bg-slate-900">{c}반</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <input
              className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
              placeholder="6글자 이상"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
            <input
              className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
              placeholder="한번 더 입력해주세요"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>

          <button
            className="btn-primary w-full py-4 text-sm mt-4"
            onClick={onSignup}
            disabled={loading}
          >
            {loading ? "CREATING ACCOUNT..." : "SIGN UP"}
          </button>

          {msg && (
            <div className="mt-2 text-center text-xs font-bold text-rose-400 animate-pulse">
              {msg}
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-6">
            <Link href="/login" className="text-xs font-black text-sky-400 hover:text-sky-300 uppercase tracking-widest transition-colors">
              Already have an account?
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
