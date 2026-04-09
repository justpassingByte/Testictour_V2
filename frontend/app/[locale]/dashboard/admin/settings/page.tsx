"use client"
import dynamic from "next/dynamic"

import { useTranslations } from "next-intl"

const LoadingSection = () => <div className="py-8 text-center text-muted-foreground">Loading...</div>
const SettingsTab = dynamic(() => import("../components/SettingsTab"), { loading: LoadingSection })

export default function AdminSettingsPage() {
  const t = useTranslations("common")
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings", { defaultValue: "Settings" })}</h1>
        <p className="text-muted-foreground text-sm">{t("settings_desc", { defaultValue: "Platform settings, notifications, feature flags, and subscription plans." })}</p>
      </div>
      <SettingsTab />
    </div>
  )
}
