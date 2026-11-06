import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Esylivo Reach — Jobs from LinkedIn, Naukri, Indeed & Foundit, applied for you", template: "%s · Esylivo Reach" },
  description:
    "Esylivo Reach finds jobs on LinkedIn, Naukri, Indeed and Foundit, pulls out recruiters' emails and phone numbers, and sends a resume tailored to each job description, automatically.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b1f",
  // Lets the bottom tab bar use env(safe-area-inset-bottom) above the iPhone home indicator.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
