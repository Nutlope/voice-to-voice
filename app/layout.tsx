import type { Metadata } from "next";
import { Geist_Mono, Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Together Voice",
  description: "Voice-to-voice AI demo running entirely on Together AI models.",
  openGraph: {
    title: "Together Voice",
    description: "Voice-to-voice AI demo running entirely on Together AI models.",
    images: [
      {
        url: "/cover/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Together Voice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Together Voice",
    description: "Voice-to-voice AI demo running entirely on Together AI models.",
    images: ["/cover/og-cover.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
