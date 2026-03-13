import { Suspense } from "react";
import { AIControlClient } from "@/app/ai-control/ai-control-client";

export const dynamic = "force-dynamic";

export default function AIControlPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AIControlClient />
    </Suspense>
  );
}
