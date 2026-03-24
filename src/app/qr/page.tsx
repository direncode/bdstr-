"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { BanditosLogo } from "@/components/BanditosLogo";
import { Suspense } from "react";

interface QrSession {
  id: string; code: string; name: string;
  claimed_by: string | null; claimed_name: string | null; is_active: boolean;
}

export default function QRPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-banditos-dark flex items-center justify-center"><BanditosLogo size="md" /></div>}>
      <QRContent />
    </Suspense>
  );
}

function QRContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const printMode = searchParams.get("print");
  const [sessions, setSessions] = useState<QrSession[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/qr-sessions")
      .then(r => r.json())
      .then(async (d) => {
        let active = (d.sessions || []).filter((s: QrSession) => s.is_active);

        // Filter for table codes in print mode
        if (printMode === "tables") {
          active = active.filter((s: QrSession) => s.name.toLowerCase().startsWith("table"));
        }

        setSessions(active);

        const base = window.location.origin;
        const images: Record<string, string> = {};
        for (const s of active) {
          images[s.code] = await QRCode.toDataURL(`${base}/join/${s.code}`, {
            width: 400,
            margin: 2,
            color: { dark: "#1a0a2e", light: "#ffffff" },
            errorCorrectionLevel: "H",
          });
        }
        setQrImages(images);

        // Auto-trigger print dialog for print mode
        if (printMode && active.length > 0) {
          setTimeout(() => window.print(), 500);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [printMode]);

  const handlePrintAll = () => window.print();

  if (loading) {
    return <div className="min-h-screen bg-banditos-dark flex items-center justify-center" role="status"><BanditosLogo size="md" /></div>;
  }

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .qr-card { page-break-inside: avoid; break-inside: avoid; }
          .qr-grid-compact .qr-card { padding: 12px !important; }
          .qr-grid-compact img { width: 120px !important; height: 120px !important; }
        }
      `}</style>

      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6">
        <nav className="no-print flex items-center justify-between mb-6 max-w-4xl mx-auto">
          <button onClick={() => router.push("/")} className="text-white/40 hover:text-white text-sm" aria-label="Go back to home">&larr; Home</button>
          <BanditosLogo size="sm" />
          <button onClick={handlePrintAll} className="bg-banditos-gold text-banditos-dark px-4 py-2 rounded-xl font-bold text-sm">Print All</button>
        </nav>

        <h1 className="no-print text-white text-2xl font-bold text-center mb-2">
          {printMode === "tables" ? "Table QR Codes" : "QR Codes"}
        </h1>
        <p className="no-print text-white/40 text-sm text-center mb-8">
          {printMode === "tables"
            ? "Print these for each table. Players scan → auto check-in → trivia night activated."
            : "Print and place at Bandidos. Players scan to join trivia."}
        </p>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-lg">No QR codes yet.</p>
            <button onClick={() => router.push("/admin?tab=qrcodes")} className="mt-4 text-banditos-gold hover:underline">Create QR codes in Admin</button>
          </div>
        ) : (
          <div className={`grid gap-6 max-w-4xl mx-auto ${
            printMode === "tables"
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 qr-grid-compact"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {sessions.map((s) => (
              <div key={s.id} className="qr-card bg-white rounded-2xl p-6 text-center shadow-lg">
                <h2 className={`font-black text-[#1a0a2e] ${printMode === "tables" ? "text-lg" : "text-2xl"}`}>BANDIDOS TRIVIA</h2>
                <p className="text-[#C41E3A] font-bold text-lg mt-1">{s.name}</p>
                <p className="text-[#1a0a2e]/60 text-sm">Scan to check in!</p>
                {qrImages[s.code] && (
                  <img src={qrImages[s.code]} alt={`QR code for ${s.name}`} className={`mx-auto mt-3 ${printMode === "tables" ? "w-36 h-36" : "w-48 h-48"}`} />
                )}
                <p className="text-[#1a0a2e]/30 text-xs font-mono mt-1">{s.code}</p>
                <p className="text-[#1a0a2e]/60 text-xs font-medium mt-2">Bandidos &middot; Franklin St, Chapel Hill</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
