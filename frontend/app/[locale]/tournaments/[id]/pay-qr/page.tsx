"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import api from "@/app/lib/apiConfig";

export default function VietQRPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("Tournament");

  const tournamentId = params?.id as string;
  const ref = searchParams?.get("ref") || "";
  const amount = searchParams?.get("amount") || "0";

  const [paymentStatus, setPaymentStatus] = useState("pending");

  // In a real system, you'd fetch the recipient's bank detail (Platform or Host).
  // Defaulting to a placeholder bin & account for Sepay QR API.
  const bankBin = "970436"; // Vietcombank
  const bankAcc = "VIRTUAL_AC"; 
  const qrUrl = `https://qr.sepay.vn/img?acc=${bankAcc}&bank=${bankBin}&amount=${amount}&des=${ref}`;

  useEffect(() => {
    // Poll the backend to check if the transaction is matched/paid
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/tournaments/${tournamentId}/payment-status?ref=${ref}`);
        if (res.data?.status === "paid" || res.data?.status === "success") {
          setPaymentStatus("success");
          clearInterval(interval);
          setTimeout(() => {
             router.push(`/tournaments/${tournamentId}?paymentSuccess=true`);
          }, 3000);
        } else if (res.data?.status === "expired") {
          setPaymentStatus("expired");
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tournamentId, ref, router]);

  if (!ref) return <div className="text-center p-8">Invalid Payment Reference</div>;

  return (
    <div className="container max-w-lg mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <Card className="p-8 bg-[#1a1a1a] border-white/10 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Bank Transfer (VietQR)</h1>
          <p className="text-sm text-gray-400">Scan this QR code with your banking app to complete registration.</p>
        </div>

        {paymentStatus === "pending" ? (
          <>
            <div className="p-4 bg-white rounded-xl inline-block">
              {/* Using native img to bypass Next.js hostname restrictions for external QRs without next.config.js update */}
              <img src={qrUrl} alt="VietQR" className="w-[250px] h-[250px] object-contain" />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-left">
                <span className="text-gray-400 text-sm">Amount to Pay</span>
                <span className="text-xl font-bold text-orange-500">{parseInt(amount).toLocaleString()} VND</span>
              </div>
              <div className="flex justify-between items-center text-left">
                <span className="text-gray-400 text-sm">Transfer Content <br/><span className="text-xs text-red-400">(Required)</span></span>
                <span className="text-lg font-mono font-bold text-white bg-black/50 p-2 rounded tracking-widest">{ref}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for Sepay verification... (Up to 1 min)</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
              <Clock className="w-3 h-3" />
              <span>QR Code expires in 15 minutes</span>
            </div>
          </>
        ) : paymentStatus === "success" ? (
          <div className="py-12 space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Payment Received!</h2>
            <p className="text-gray-400">Your registration is confirmed. Redirecting...</p>
          </div>
        ) : (
          <div className="py-12 space-y-4">
            <h2 className="text-xl font-bold text-red-500">Payment Expired</h2>
            <p className="text-gray-400">The 15-minute window has closed. Please try registering again.</p>
            <Button onClick={() => router.push(`/tournaments/${tournamentId}`)} className="bg-orange-500 hover:bg-orange-600 text-white w-full border-none">
              Return to Tournament
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
