import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rich World — Your Habit Game",
  description: "Defeat habit monsters, grow your Novice from level 1 to 99, and work toward your real-world goals.",
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
