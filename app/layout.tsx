import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hi-Tech Pipe Quotation",
  description: "Pipe nesting, freight optimization, and quotation generation"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
