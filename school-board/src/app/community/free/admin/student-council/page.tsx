import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/serverAuth";
import AdminStudentCouncilClient from "./AdminStudentCouncilClient";

export const dynamic = "force-dynamic";

export default async function AdminStudentCouncilPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/community/free/admin/student-council");
    notFound();
  }

  return <AdminStudentCouncilClient />;
}
