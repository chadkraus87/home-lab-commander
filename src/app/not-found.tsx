import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={<MapPinOff />}
        title="That infrastructure view does not exist"
        description="The page may have moved or the referenced device is no longer managed."
        action={
          <Link className="button button-primary button-default" href="/">
            Return to overview
          </Link>
        }
      />
    </Card>
  );
}
