"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";

export default function QRPage() {
  const [dataUrl, setDataUrl] = useState("");
  const [url, setUrl] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const base = window.location.origin;
    setUrl(base);
    QRCode.toDataURL(base, {
      width: 600,
      margin: 2,
      color: { dark: "#1a0a2e", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setDataUrl);
  }, []);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print styles */}
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
        {/* Screen view */}
        <div className="no-print mb-4">
          <a href="/" className="text-white/40 text-sm hover:text-white/60">← Back to home</a>
        </div>

        <div ref={printRef} className="print-area bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <h1 className="text-3xl font-black text-[#1a0a2e] tracking-tight">
            🌮 BANDITOS TRIVIA
          </h1>
          <p className="text-[#1a0a2e]/60 mt-1 text-sm font-medium">
            Scan to play live trivia!
          </p>

          {dataUrl && (
            <img
              src={dataUrl}
              alt="QR Code to join trivia"
              className="mx-auto mt-4 w-64 h-64 sm:w-72 sm:h-72"
            />
          )}

          <p className="mt-3 text-[#1a0a2e]/40 text-xs font-mono break-all">{url}</p>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-[#1a0a2e] font-bold text-sm">
              Bandidos Mexican Cafe · Franklin St, Chapel Hill
            </p>
          </div>
        </div>

        <div className="no-print mt-6 flex flex-col gap-3 w-full max-w-md">
          <button
            onClick={handlePrint}
            className="w-full bg-banditos-gold text-banditos-dark py-3 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity"
          >
            PRINT QR CODE
          </button>
          <p className="text-white/30 text-xs text-center">
            Print this and place it on tables, at the bar, or at the entrance.
            <br />Players scan to join instantly from their phones.
          </p>
        </div>
      </div>
    </>
  );
}
