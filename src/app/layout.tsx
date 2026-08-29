import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoVista — Real-Time India Travel Intelligence & AI Trip Planner",
  description:
    "EcoVista combines visual destination discovery, live weather telemetry, seasonal intelligence, an interactive India map, and an AI-powered multi-day trip planner.",
  keywords: [
    "India travel",
    "AI trip planner",
    "live weather",
    "hill stations",
    "itinerary builder",
    "EcoVista",
  ],
};

const themeScript = `
  (function () {
    try {
      var stored = localStorage.getItem('ecovista-theme');
      var prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      var t = stored === 'dark' || stored === 'light' ? stored : (prefers ? 'light' : 'dark');
      if (t === 'light') document.documentElement.classList.add('light');
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
