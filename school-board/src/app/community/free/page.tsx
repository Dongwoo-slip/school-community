import { Suspense } from "react";
import MainBoardClient from "./MainBoardClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-slate-600 text-sm">불러오는 중…</div>}>
      <MainBoardClient />
    </Suspense>
  );
}
