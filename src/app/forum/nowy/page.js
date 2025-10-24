// src/app/forum/nowy/page.js
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import NewThreadForm from "./FormClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewThreadForm />
    </Suspense>
  );
}
