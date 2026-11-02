import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyBook | Studio Photoshoot Booking & Scheduling",
  description:
    "Seamlessly book your photoshoot session with dynamic live slot availability, automated calendar sync, and guest management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[#0f0f0f] text-[#f1f1f1] selection:bg-[#ff0000]/25 selection:text-white">
        {children}
      </body>
    </html>
  );
}
