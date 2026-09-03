import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["400", "500", "600"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "ayna Tracker",
  description: "ayna's private internal work tracker",
  applicationName: "ayna Tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ayna Tracker",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F1E8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${fraunces.variable} ${inter.variable} font-sans text-text-primary`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
