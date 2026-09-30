import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rich World — Your Habit Game",
  description: "Read 10 pages, enjoy a good breakfast, and build your rich world one habit at a time.",
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
