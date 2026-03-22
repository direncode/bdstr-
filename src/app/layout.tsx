import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Banditos Trivia",
  description: "Live trivia at Bandidos Mexican Restaurant — Chapel Hill, NC",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Banditos Trivia",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased overscroll-none">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
