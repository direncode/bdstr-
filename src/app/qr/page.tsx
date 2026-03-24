"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { BanditosLogo } from "@/components/BanditosLogo";
import { Suspense } from "react";

interface QrSession {
  id: string; code: string; name: string; qr_type: string;
  claimed_by: string | null; claimed_name: string | null; is_active: boolean;
}

const TYPE_META: Record<string, { label: string; multiplier: string; color: string; subtitle: string; cardBg: string }> = {
  outside: { label: "Outside", multiplier: "1x", color: "#3b82f6", subtitle: "Scan to play trivia!", cardBg: "#eff6ff" },
  inside: { label: "Inside", multiplier: "2x", color: "#22c55e", subtitle: "Scan for 2x points!", cardBg: "#f0fdf4" },
  trivia_night: { label: "Trivia Night", multiplier: "3x", color: "#a855f7", subtitle: "Scan to check in — 3x points!", cardBg: "#faf5ff" },
};

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
  const printMode = searchParams.get("print"); // "outside", "inside", "trivia_night", or null
  const [sessions, setSessions] = useState<QrSession[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/qr-sessions")
      .then(r => r.json())
      .then(async (d) => {
        let active = (d.sessions || []).filter((s: QrSession) => s.is_active);

        // Filter by type if in print mode
        if (printMode && ["outside", "inside", "trivia_night"].includes(printMode)) {
          active = active.filter((s: QrSession) => (s.qr_type || "inside") === printMode);
        }

        setSessions(active);

        const base = window.location.origin;
        const images: Record<string, string> = {};
        for (const s of active) {
          const meta = TYPE_META[s.qr_type || "inside"] || TYPE_META.inside;
          images[s.code] = await QRCode.toDataURL(`${base}/join/${s.code}`, {
            width: 400,
            margin: 2,
            color: { dark: meta.color, light: "#ffffff" },
            errorCorrectionLevel: "H",
          });
        }
        setQrImages(images);

        if (printMode && active.length > 0) {
          setTimeout(() => window.print(), 500);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [printMode]);

  const handlePrintAll = () => window.print();
  const meta = printMode ? TYPE_META[printMode] || TYPE_META.inside : null;

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
        }
      `}</style>

      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6">
        <nav className="no-print flex items-center justify-between mb-6 max-w-4xl mx-auto">
          <button onClick={() => router.push("/admin?tab=qrcodes")} className="text-white/40 hover:text-white text-sm">&larr; Admin</button>
          <BanditosLogo size="sm" />
          <button onClick={handlePrintAll} className="bg-banditos-gold text-banditos-dark px-4 py-2 rounded-xl font-bold text-sm">Print All</button>
        </nav>

        <h1 className="no-print text-white text-2xl font-bold text-center mb-2">
          {meta ? `${meta.label} QR Codes (${meta.multiplier})` : "All QR Codes"}
        </h1>
        <p className="no-print text-white/40 text-sm text-center mb-8">
          {meta ? `Print and place at Bandidos. ${meta.subtitle}` : "Print and place at Bandidos."}
        </p>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-lg">No QR codes of this type yet.</p>
            <button onClick={() => router.push("/admin?tab=qrcodes")} className="mt-4 text-banditos-gold hover:underline">Generate in Admin</button>
          </div>
        ) : (
          <div className={`grid gap-4 max-w-4xl mx-auto ${
            sessions.length > 6 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {sessions.map((s) => {
              const m = TYPE_META[s.qr_type || "inside"] || TYPE_META.inside;
              return (
                <div key={s.id} className="qr-card rounded-2xl p-5 text-center shadow-lg" style={{ background: m.cardBg }}>
                  <h2 className="text-lg font-black" style={{ color: "#1a0a2e" }}>BANDIDOS TRIVIA</h2>
                  <p className="font-bold text-base mt-0.5" style={{ color: m.color }}>{s.name}</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: m.color }}>{m.multiplier} POINTS</p>
                  <p className="text-xs mt-0.5" style={{ color: "#1a0a2e", opacity: 0.5 }}>{m.subtitle}</p>
                  {qrImages[s.code] && (
                    <img src={qrImages[s.code]} alt={`QR for ${s.name}`} className="mx-auto mt-2 w-36 h-36" />
                  )}
                  <p className="font-mono text-[10px] mt-1" style={{ color: "#1a0a2e", opacity: 0.25 }}>{s.code}</p>
                  <p className="text-[10px] font-medium mt-1" style={{ color: "#1a0a2e", opacity: 0.4 }}>Bandidos &middot; Franklin St, Chapel Hill</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
