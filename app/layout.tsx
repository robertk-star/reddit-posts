import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Opportunity Radar",
  description: "Find helpful places to answer questions and draft human-reviewed replies."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
