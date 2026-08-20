import { Suspense } from "react";
import { SettingsPage } from "@/features/settings/settings-page";
export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 650 }} />}>
      <SettingsPage />
    </Suspense>
  );
}
