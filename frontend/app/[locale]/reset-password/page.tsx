"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AuthClientService } from "@/app/services/AuthClientService"
import { Loader2, Lock, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react"

type PageState = "idle" | "submitting" | "success" | "token_invalid" | "token_expired"

function ResetPasswordForm() {
  const t = useTranslations("common")
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") || ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [state, setState] = useState<PageState>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [countdown, setCountdown] = useState(5)

  // Auto-redirect to login after success
  useEffect(() => {
    if (state !== "success") return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [state, router])

  // If no token in URL, show invalid state
  useEffect(() => {
    if (!token) {
      setState("token_invalid")
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    if (newPassword.length < 8) {
      setErrorMessage(t("auth.resetPassword.passwordTooShort"))
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("auth.passwordMismatch"))
      return
    }

    setState("submitting")

    try {
      await AuthClientService.resetPassword(token, newPassword)
      setState("success")
    } catch (err: any) {
      const msg = err.message || ""
      if (msg.toLowerCase().includes("expired")) {
        setState("token_expired")
      } else {
        setState("token_invalid")
      }
      setErrorMessage(msg || t("auth.resetPassword.errorGeneric"))
    }
  }

  // ── Invalid / Expired token states ──
  if (state === "token_invalid" || state === "token_expired") {
    return (
      <div className="text-center py-8 space-y-4 animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">
          {state === "token_expired"
            ? t("auth.resetPassword.linkExpired")
            : t("auth.resetPassword.linkInvalid")}
        </h3>
        <p className="text-sm text-zinc-400 max-w-xs mx-auto">
          {state === "token_expired"
            ? t("auth.resetPassword.linkExpiredDesc")
            : t("auth.resetPassword.linkInvalidDesc")}
        </p>
        {errorMessage && (
          <p className="text-xs text-red-400/70">{errorMessage}</p>
        )}
        <div className="pt-4 flex flex-col items-center gap-3">
          <Link href="/forgot-password">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              {t("auth.resetPassword.requestNewLink")}
            </Button>
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-indigo-400 transition-colors">
            {t("auth.forgotPassword.backToHome")}
          </Link>
        </div>
      </div>
    )
  }

  // ── Success state ──
  if (state === "success") {
    return (
      <div className="text-center py-8 space-y-4 animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">
          {t("auth.resetPassword.successTitle")}
        </h3>
        <p className="text-sm text-zinc-400 max-w-xs mx-auto">
          {t("auth.resetPassword.successDesc")}
        </p>
        <p className="text-xs text-zinc-500">
          {t("auth.resetPassword.redirecting", { seconds: countdown })}
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button variant="outline" className="bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              {t("auth.resetPassword.goToLogin")}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Form state (idle / submitting) ──
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-zinc-300 text-sm">
          {t("auth.resetPassword.newPassword")}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            id="new-password"
            type="password"
            required
            minLength={8}
            className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 h-11"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={state === "submitting"}
          />
        </div>
        <p className="text-xs text-zinc-500">{t("auth.resetPassword.minChars")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-new-password" className="text-zinc-300 text-sm">
          {t("auth.confirmPassword")}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            id="confirm-new-password"
            type="password"
            required
            minLength={8}
            className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 h-11"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={state === "submitting"}
          />
        </div>
      </div>

      {errorMessage && state === "idle" && (
        <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={state === "submitting" || !newPassword || !confirmPassword}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
      >
        {state === "submitting" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          t("auth.resetPassword.resetButton")
        )}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  const t = useTranslations("common")

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-indigo-950/20 to-zinc-950">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md bg-zinc-950/80 border-zinc-800/50 backdrop-blur-xl shadow-2xl shadow-indigo-900/10">
        <CardHeader className="text-center pb-2">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-zinc-400 hover:text-indigo-400 transition-colors mb-6 self-start"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("auth.forgotPassword.backToHome")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400">
            {t("auth.resetPassword.title")}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {t("auth.resetPassword.description")}
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
