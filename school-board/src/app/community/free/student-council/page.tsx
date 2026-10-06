import { notFound, redirect } from "next/navigation";
import { requireStudentCouncilAccess } from "@/lib/studentCouncilServer";
import StudentCouncilListClient from "./StudentCouncilListClient";

export const dynamic = "force-dynamic";

export default async function StudentCouncilPage() {
  const access = await requireStudentCouncilAccess();
  if (!access.ok) {
    if (access.status === 401) redirect("/login?next=/community/free/student-council");
    notFound();
  }

  return (
    <StudentCouncilListClient
      isAdmin={access.isAdmin}
      featureEnabled={access.featureEnabled}
    />
  );
}
