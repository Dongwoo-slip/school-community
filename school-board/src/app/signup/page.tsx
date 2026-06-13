"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SquareLogoMark } from "@/components/SquareLogo";

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
};
type VerificationMsg = {
  text: string;
  tone: "success" | "error";
};

const COMMUNITY_RULES = `청주고 Square는 청주고등학교 학생들이 학교생활과 다양한 정보를 자유롭게 나누기 위한 온라인 커뮤니티입니다. 이 공간은 학생들의 자율적인 소통을 존중하지만, 그 자유는 다른 사람의 권리와 안전을 침해하지 않는 범위 안에서만 보장됩니다. 회원은 서비스를 이용하면서 타인을 존중하고, 사실에 근거한 내용을 작성하며, 자신의 글과 채팅에 책임을 져야 합니다.

회원은 특정 학생, 교직원, 학급, 동아리 또는 단체를 비방하거나 조롱하는 글을 작성해서는 안 됩니다. 또한 타인의 이름, 학번, 반, 사진, 연락처, SNS 계정, 카카오톡 ID 등 개인정보를 허락 없이 공개하거나, 직접 밝히지 않더라도 누구인지 쉽게 알 수 있도록 작성해서는 안 됩니다. 확인되지 않은 소문, 허위사실, 사생활 폭로, 명예훼손성 게시물, 욕설, 혐오 표현, 성희롱, 외모 평가, 장애·성별·지역·성적 등에 대한 비하 표현 역시 금지됩니다.

익명 기능은 학생들이 부담 없이 의견을 나눌 수 있도록 마련된 기능이지만, 익명이라는 이유로 책임이 사라지는 것은 아닙니다. 익명으로 표시되는 게시글이나 채팅이라도 작성자는 해당 내용에 대한 책임을 집니다. 운영자는 신고, 분쟁, 학교폭력 의심, 명백한 규칙 위반 등 커뮤니티 안전을 위해 필요한 경우에 한해 작성 기록, 계정 정보, 인증 여부 등을 확인할 수 있습니다.

회원은 타인의 계정을 사용하거나, 인증코드를 양도하거나, 허위로 인증하거나, 다른 사람을 대신해 인증해서는 안 됩니다. 또한 도배, 광고, 악의적인 신고, 운영 방해, 불법 촬영물 또는 합성 이미지 공유, 폭력적·음란한 자료 게시 등 커뮤니티의 질서와 안전을 해치는 행위를 해서는 안 됩니다.

운영자는 위 규칙을 위반한 게시글, 댓글, 채팅을 사전 통보 없이 삭제하거나 숨길 수 있으며, 위반 정도에 따라 경고, 글쓰기 제한, 채팅 제한, 계정 일시 정지 또는 영구 정지 등의 조치를 할 수 있습니다. 특히 타인의 개인정보를 침해하거나 학교폭력, 명예훼손, 성희롱, 불법 자료 공유 등 중대한 문제가 발생한 경우에는 학교 또는 관련 기관의 요청에 따라 필요한 범위에서 협조할 수 있습니다.

회원은 청주고 Square를 이용함으로써 위 내용을 읽고 이해했으며, 타인의 권리와 개인정보를 침해하지 않고 책임감 있게 커뮤니티를 이용할 것을 확인합니다. 또한 규칙을 위반할 경우 운영 조치를 받을 수 있음을 인정합니다.`;

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
  const [verificationMsg, setVerificationMsg] = useState<VerificationMsg | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [rulesAgreed, setRulesAgreed] = useState(false);

  async function checkVerificationCode() {
    setMsg(null);
    setVerificationMsg(null);
    setVerificationPreview(null);
    const code = verificationCode.trim();
    if (!code) {
      setVerificationMsg({ text: "인증코드를 입력해 주세요.", tone: "error" });
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
        setVerificationMsg({ text: json?.error ?? "인증코드를 확인하지 못했습니다.", tone: "error" });
        return;
      }

      const preview = {
        studentNo: json.studentNo ? String(json.studentNo) : null,
      };
      setVerificationPreview(preview);
      setVerificationMsg({ text: `학번 (${preview.studentNo ?? "학번 정보 없음"}) 으로 인증 되었습니다`, tone: "success" });
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
    if (!rulesAgreed) return setMsg("커뮤니티 이용규칙 및 안전 서약에 동의해 주세요.");
    if (code && !verificationPreview) {
      setVerificationMsg({ text: "인증코드를 사용하려면 먼저 확인을 눌러 주세요.", tone: "error" });
      return;
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

      await ensureSession();

      const tryServerPatch = async () => {
        const res = await fetch("/api/me", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade, classNo }),
        });
        const json = await res.json().catch(() => ({}));
        return res.ok && json?.ok;
      };

      const ok1 = await tryServerPatch();
      if (!ok1 && !code) {
        setMsg("가입은 완료됐지만 프로필 저장에 실패했습니다. 다시 로그인한 뒤 내 정보에서 저장해 주세요.");
        return;
      }

      if (code && verificationPreview) {
        const res = await fetch("/api/student-verification/claim", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setVerificationMsg({ text: `가입은 완료됐지만 인증 연결에 실패했습니다: ${json?.error ?? "알 수 없는 오류"}`, tone: "error" });
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
          <SquareLogoMark size={54} className="mb-3" />
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
	                    setVerificationMsg(null);
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
	            {verificationMsg ? (
	              <div
	                style={{
	                  border: verificationMsg.tone === "success" ? '1px solid rgba(31,126,219,0.18)' : '1px solid rgba(200,45,63,0.18)',
	                  background: verificationMsg.tone === "success" ? 'rgba(31,126,219,0.07)' : 'rgba(200,45,63,0.07)',
	                  borderRadius: 8,
	                  padding: '0.55rem 0.7rem',
	                  fontSize: '0.78rem',
	                  fontWeight: 650,
	                  color: verificationMsg.tone === "success" ? 'var(--brand-light)' : 'var(--accent-red)',
	                  lineHeight: 1.5,
	                }}
	              >
	                {verificationMsg.text}
	              </div>
            ) : null}
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

          <div style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', borderRadius: 10, padding: '0.85rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.55rem' }}>
              커뮤니티 이용규칙 및 안전 서약
            </div>
            <div
              style={{
                maxHeight: 145,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--border-subtle)',
                background: '#fff',
                borderRadius: 8,
                padding: '0.75rem',
                fontSize: '0.73rem',
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
              }}
            >
              {COMMUNITY_RULES}
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', marginTop: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rulesAgreed}
                onChange={(e) => setRulesAgreed(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--brand)' }}
              />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.45, color: 'var(--text-primary)' }}>
                [필수] 위 커뮤니티 이용규칙 및 안전 서약을 읽고 동의합니다.
              </span>
            </label>
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
