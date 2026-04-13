"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const AdminEscrowOperationsTab = dynamic(
  () => import("../components/AdminEscrowOperationsTab"),
  { loading: () => <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div> }
);

export default function AdminEscrowPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escrow Operations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review manual payment proofs, retry failed webhooks, release prize payouts, and manage disputes.
        </p>
      </div>
      <AdminEscrowOperationsTab />
    </div>
  );
}
