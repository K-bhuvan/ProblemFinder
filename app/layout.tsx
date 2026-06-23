import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Problem Finder",
  description: "Find startup-worthy problems from public discussion signals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
