"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@school-board.test`;
}

const FIELD_STYLE = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
} as const;

const SELECT_STYLE = {
  ...FIELD_STYLE,
  appearance: 'none' as const,
  cursor: 'pointer',
};

type VerificationPreview = {
  studentNo?: string | null;
  studentName: string;
  grade: number;
  classNo: number;
};

export default function SignupPage() {
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [grade, setGrade] = useState<number>(2);
  const [classNo, setClassNo] = useState<number>(7);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationPreview, setVerificationPreview] = useState<VerificationPreview | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  async function checkVerificationCode() {
    setMsg(null);
    setVerificationPreview(null);
    const code = verificationCode.trim();
    if (!code) return setMsg("인증코드를 입력해 주세요.");

    setVerificationLoading(true);
    try {
      const res = await fetch("/api/student-verification/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "인증코드를 확인하지 못했습니다.");
        return;
      }

      const preview = {
        studentNo: json.studentNo ? String(json.studentNo) : null,
        studentName: String(json.studentName ?? ""),
        grade: Number(json.grade),
        classNo: Number(json.classNo),
      };
      setVerificationPreview(preview);
      if ([1, 2, 3].includes(preview.grade)) setGrade(preview.grade);
      if (Number.isInteger(preview.classNo) && preview.classNo >= 1 && preview.classNo <= 11) {
        setClassNo(preview.classNo);
      }
    } finally {
      setVerificationLoading(false);
    }
  }

  async function onSignup() {
    setMsg(null);
    const u = username.trim().toLowerCase();
    const code = verificationCode.trim();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return setMsg("아이디는 영문/숫자/_ 만 가능 (3~20자)");
    if (password.length < 6) return setMsg("비밀번호는 6글자 이상");
    if (password !== password2) return setMsg("비밀번호가 일치하지 않습니다.");
    if (!(grade >= 1 && grade <= 3)) return setMsg("학년은 1~3만 가능합니다.");
    if (!(classNo >= 1 && classNo <= 11)) return setMsg("반은 1~11만 가능합니다.");
    if (code && !verificationPreview) {
      return setMsg("인증코드를 사용하려면 먼저 확인을 눌러 주세요. 인증 없이 가입하려면 코드를 비워두면 됩니다.");
    }

    setLoading(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: toEmail(u),
        password,
        options: { data: { username: u, grade, class_no: classNo } },
      });

      if (error) return setMsg(error.message);

      const ensureSession = async () => {
        if (signUpData?.session) return signUpData.session;
        const { data: si, error: se } = await supabase.auth.signInWithPassword({ email: toEmail(u), password });
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

      if (code && verificationPreview) {
        const res = await fetch("/api/student-verification/claim", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg(`가입은 완료됐지만 인증 연결에 실패했습니다: ${json?.error ?? "알 수 없는 오류"}`);
          return;
        }
      }

      const params = new URLSearchParams(location.search);
      location.href = params.get("next") ?? "/community/free";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, background: 'var(--brand)', borderRadius: 12, fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.75rem' }}>SQ</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>회원가입</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>청주고등학교 커뮤니티</p>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', borderRadius: 10, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>개별 인증코드 선택 입력</label>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <input
                  style={{ ...FIELD_STYLE, background: '#fff', flex: 1, textTransform: 'uppercase' }}
                  placeholder="인증코드"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value);
                    setVerificationPreview(null);
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={checkVerificationCode}
                  disabled={verificationLoading || loading}
                >
                  {verificationLoading ? "확인중" : "확인"}
                </button>
              </div>
            </div>
            {verificationPreview ? (
              <div style={{ border: '1px solid rgba(31,126,219,0.18)', background: 'rgba(31,126,219,0.07)', borderRadius: 8, padding: '0.55rem 0.7rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                이름: <b style={{ color: 'var(--text-primary)' }}>{verificationPreview.studentName}</b>
                <span style={{ marginLeft: '0.5rem' }}>
                  {verificationPreview.studentNo ?? `${verificationPreview.grade}학년 ${verificationPreview.classNo}반`}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                인증코드는 선택사항입니다. 확인하면 이름을 보고 맞는지 확인한 뒤 가입할 수 있어요.
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>아이디</label>
            <input
              style={FIELD_STYLE}
              placeholder="영문, 숫자, _ (3~20자)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>학년</label>
              <select style={SELECT_STYLE} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                {[1, 2, 3].map(g => <option key={g} value={g} style={{ background: 'var(--bg-elevated)' }}>{g}학년</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>반</label>
              <select style={SELECT_STYLE} value={classNo} onChange={(e) => setClassNo(Number(e.target.value))}>
                {Array.from({ length: 11 }, (_, i) => i + 1).map(c => <option key={c} value={c} style={{ background: 'var(--bg-elevated)' }}>{c}반</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>비밀번호</label>
            <input
              style={FIELD_STYLE}
              placeholder="6글자 이상"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>비밀번호 확인</label>
            <input
              style={FIELD_STYLE}
              placeholder="한번 더 입력해주세요"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>

          {msg && (
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-red)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
              {msg}
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.9rem', marginTop: '0.25rem' }}
            onClick={onSignup}
            disabled={loading}
          >
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <Link href="/login" style={{ fontSize: '0.78rem', color: 'var(--brand-light)', fontWeight: 600 }}>이미 계정이 있어요</Link>
          <Link href="/community/free" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>홈으로</Link>
        </div>
      </div>
    </div>
  );
}
