"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <EmptyState
        icon={<AlertTriangle />}
        title="This view could not be loaded"
        description="Your data is still safe. The local server may be starting or the database may be temporarily unavailable."
        action={
          <Button onClick={reset}>
            <RotateCcw size={15} />
            Try again
          </Button>
        }
      />
    </Card>
  );
}
