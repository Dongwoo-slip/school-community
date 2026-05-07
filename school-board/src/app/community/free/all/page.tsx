import { Suspense } from "react";
import AllBoardClient from "./AllBoardClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-slate-600 text-sm">불러오는 중…</div>}>
      <AllBoardClient />
    </Suspense>
  );
}
