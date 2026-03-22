"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";

export default function QRSessionPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [dataUrl, setDataUrl] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    const base = window.location.origin;
    const url = `${base}/join/${code}`;
    setJoinUrl(url);

    QRCode.toDataURL(url, {
      width: 600,
      margin: 2,
      color: { dark: "#1a0a2e", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setDataUrl);

    // Load session name
    fetch(`/api/qr-sessions?code=${code}`)
      .then(r => r.json())
      .then(d => { if (d.name) setSessionName(d.name); })
      .catch(() => {});
  }, [code]);

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: white !important;
            padding: 2rem;
          }
          .print-area img { width: 4in; height: 4in; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <div className="no-print mb-4">
          <a href="/admin" className="text-white/40 text-sm hover:text-white/60">&larr; Back to admin</a>
        </div>

        <div className="print-area bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <h1 className="text-3xl font-black text-[#1a0a2e] tracking-tight">
            🌮 BANDITOS TRIVIA
          </h1>
          {sessionName && (
            <p className="text-[#C41E3A] font-bold text-lg mt-1">{sessionName}</p>
          )}
          <p className="text-[#1a0a2e]/60 mt-1 text-sm font-medium">
            Scan to play live trivia!
          </p>

          {dataUrl && (
            <img
              src={dataUrl}
              alt={`QR Code for ${sessionName || code}`}
              className="mx-auto mt-4 w-64 h-64 sm:w-72 sm:h-72"
            />
          )}

          <p className="mt-2 text-[#1a0a2e]/30 text-xs font-mono">{code}</p>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-[#1a0a2e] font-bold text-sm">
              Bandidos Mexican Cafe &middot; Franklin St, Chapel Hill
            </p>
          </div>
        </div>

        <div className="no-print mt-6 flex flex-col gap-3 w-full max-w-md">
          <button
            onClick={handlePrint}
            className="w-full bg-banditos-gold text-banditos-dark py-3 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity"
          >
            PRINT THIS QR CODE
          </button>
          <p className="text-white/30 text-xs text-center">
            Links to: {joinUrl}
          </p>
        </div>
      </div>
    </>
  );
}
