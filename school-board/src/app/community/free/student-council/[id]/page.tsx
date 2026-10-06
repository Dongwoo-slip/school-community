import { notFound, redirect } from "next/navigation";
import { requireStudentCouncilAccess } from "@/lib/studentCouncilServer";
import StudentCouncilDetailClient from "./StudentCouncilDetailClient";

export const dynamic = "force-dynamic";

export default async function StudentCouncilDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireStudentCouncilAccess();
  const { id } = await params;

  if (!access.ok) {
    if (access.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/community/free/student-council/${id}`)}`);
    }
    notFound();
  }

  return (
    <StudentCouncilDetailClient
      postId={id}
      isAdmin={access.isAdmin}
      featureEnabled={access.featureEnabled}
    />
  );
}
