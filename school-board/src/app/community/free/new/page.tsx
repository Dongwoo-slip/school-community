import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewPostForm from "./NewPostForm";

export default async function NewPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인 안 했으면 로그인 페이지로
  if (!user) {
    redirect("/login?next=/community/free/new");
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">글쓰기</h1>
        <a className="rounded border px-3 py-2" href="/community/free">
          목록
        </a>
      </div>

      <div className="mt-6">
        <NewPostForm />
      </div>
    </main>
  );
}
