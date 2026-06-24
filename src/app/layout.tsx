import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stateless File Encryption",
  description: "A highly secure, zero-knowledge, completely client-side file encryption utility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
