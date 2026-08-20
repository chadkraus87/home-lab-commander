import { Suspense } from "react";
import { NotesPage } from "@/features/notes/notes-page";
export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 600 }} />}>
      <NotesPage />
    </Suspense>
  );
}
