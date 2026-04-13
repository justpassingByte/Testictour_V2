"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AuthClientService } from "@/app/services/AuthClientService"
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"

type PageState = "idle" | "submitting" | "success" | "error"

export default function ForgotPasswordPage() {
  const t = useTranslations("common")
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<PageState>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setState("submitting")
    setErrorMessage("")

    try {
      await AuthClientService.forgotPassword(email.trim(), locale)
      setState("success")
    } catch (err: any) {
      setErrorMessage(err.message || t("auth.forgotPassword.errorGeneric"))
      setState("error")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-indigo-950/20 to-zinc-950">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
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
            {t("auth.forgotPassword.title")}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {t("auth.forgotPassword.description")}
          </p>
        </CardHeader>

        <CardContent>
          {state === "success" ? (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {t("auth.forgotPassword.checkEmail")}
              </h3>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                {t("auth.forgotPassword.checkEmailDesc")}
              </p>
              <div className="pt-4">
                <Link href="/">
                  <Button variant="outline" className="bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                    {t("auth.forgotPassword.backToHome")}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-zinc-300 text-sm">
                  {t("auth.email")}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 h-11"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={state === "submitting"}
                  />
                </div>
              </div>

              {state === "error" && errorMessage && (
                <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-red-400 text-sm animate-fade-in">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={state === "submitting" || !email.trim()}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
              >
                {state === "submitting" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t("auth.forgotPassword.sendLink")
                )}
              </Button>

              <p className="text-center text-xs text-zinc-500 pt-2">
                {t("auth.forgotPassword.rememberPassword")}{" "}
                <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  {t("auth.forgotPassword.signIn")}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
