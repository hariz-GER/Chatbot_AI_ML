import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AntdRegistry } from '@ant-design/nextjs-registry';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Assistant | AI Chatbot by Hariz",
  description: "A production-ready AI-powered Smart Assistant chatbot with voice input, notes, and more.",
  keywords: ["AI", "chatbot", "assistant", "Gemini", "smart assistant"],
  authors: [{ name: "Hariz" }],
  creator: "Hariz",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Smart Assistant",
  },
  openGraph: {
    title: "Smart Assistant | AI Chatbot",
    description: "AI-powered Smart Assistant chatbot by Hariz",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
