import { Suspense } from "react";
import MessagesClient from "./MessagesClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-slate-600 text-sm">불러오는 중…</div>}>
      <MessagesClient />
    </Suspense>
  );
}
