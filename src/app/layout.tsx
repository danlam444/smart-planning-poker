import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: {
    default: "Planning Poker - Free Online Scrum Estimation Tool",
    template: "%s | Planning Poker",
  },
  description: "Free real-time planning poker for agile teams. Estimate user stories together with your remote team using Fibonacci, T-shirt sizes, or custom scales. No sign-up required.",
  keywords: ["planning poker", "scrum poker", "agile estimation", "story points", "sprint planning", "remote team", "fibonacci", "t-shirt sizing"],
  authors: [{ name: "Planning Poker" }],
  creator: "Planning Poker",
  metadataBase: new URL("https://smartplanningpoker.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://smartplanningpoker.com",
    siteName: "Planning Poker",
    title: "Planning Poker - Free Online Scrum Estimation Tool",
    description: "Free real-time planning poker for agile teams. Estimate user stories together with your remote team. No sign-up required.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Planning Poker - Agile Estimation Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Planning Poker - Free Online Scrum Estimation Tool",
    description: "Free real-time planning poker for agile teams. No sign-up required.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "google-adsense-account": "ca-pub-7810758495216241",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7810758495216241"
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
