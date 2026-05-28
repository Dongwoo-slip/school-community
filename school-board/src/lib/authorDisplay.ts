export type AuthorIdentity = {
  username?: string | null;
  role?: string | null;
  points?: number | null;
  student_no?: string | null;
  student_name?: string | null;
  student_verified?: boolean | null;
  grade?: number | null;
  class_no?: number | null;
};

export const AUTHOR_PROFILE_SELECT =
  "username, role, points, student_no, student_name, student_verified, grade, class_no";

export function formatAdminStudentLabel(author?: AuthorIdentity | null) {
  if (!author) return "미인증";

  const name = String(author.student_name ?? "").trim();
  const studentNo = String(author.student_no ?? "").trim();
  const verified = Boolean(author.student_verified || name || studentNo);

  if (!verified) return "미인증";
  if (studentNo && name) return `${studentNo} ${name}`;
  if (studentNo) return studentNo;
  if (name && author.grade && author.class_no) return `${author.grade}학년 ${author.class_no}반 ${name}`;
  if (name) return name;
  return "미인증";
}
