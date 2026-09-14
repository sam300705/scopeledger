import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScopeLedger — Make extra work visible",
  description: "Track project scope, price change requests, and keep a clear approval history.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
