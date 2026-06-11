import type { SupabaseClient } from "@supabase/supabase-js";

export const STUDENT_VERIFICATION_REQUIRED_MESSAGE =
  "개별인증이 필요합니다. 마이페이지에서 인증코드를 등록한 뒤 작성해 주세요.";

type VerificationProfile = {
  role?: string | null;
  student_verified?: boolean | null;
  student_no?: string | null;
  student_name?: string | null;
};

function isVerifiedProfile(profile?: VerificationProfile | null) {
  return Boolean(
    profile?.role === "admin" ||
      profile?.student_verified ||
      profile?.student_no ||
      profile?.student_name
  );
}

export async function requireStudentVerifiedWriter(sb: SupabaseClient, userId: string) {
  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("role,student_verified,student_no,student_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false as const, status: 500, error: profileError.message };
  }

  if (isVerifiedProfile(profile)) {
    return { ok: true as const };
  }

  const { data: verification, error: verificationError } = await sb
    .from("student_verification_codes")
    .select("id")
    .eq("used_by", userId)
    .maybeSingle();

  if (verificationError) {
    return { ok: false as const, status: 500, error: verificationError.message };
  }

  if (verification) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: 403,
    error: STUDENT_VERIFICATION_REQUIRED_MESSAGE,
  };
}
