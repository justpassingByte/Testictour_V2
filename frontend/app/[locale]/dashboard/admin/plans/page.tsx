"use client";
import React from "react";
import dynamic from "next/dynamic";
import { Crown } from "lucide-react";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

const LoadingSection = () => <div className="py-8 text-center text-muted-foreground">Loading Subscription Plans...</div>;
const SubscriptionPlanConfigSection = dynamic(() => import("../components/SubscriptionPlanConfigSection"), { loading: LoadingSection });

export default function AdminPlansPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 flex items-center gap-3">
          <Crown className="h-8 w-8 text-violet-400" />
          Subscription Plans
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          Manage platform subscription plans, configure pricing, and adjust features for Partners.
        </p>
      </div>

      <SectionErrorBoundary fallbackTitle="Failed to load Subscription Plans">
        <SubscriptionPlanConfigSection />
      </SectionErrorBoundary>
    </div>
  );
}
