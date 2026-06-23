import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/components/DataProvider";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "SimpleDistance — Golf Stock Yardages & Bag Optimization",
  description:
    "Find your true stock yardages and optimize your bag — separating real trends from session noise.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DataProvider>
          <div className="min-h-screen">
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-fairway-600 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
            >
              Skip to main content
            </a>
            <Nav />
            <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none">
              {children}
            </main>
            <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-500">
              SimpleDistance is decision support, not a club fitting. All data
              stays in your browser. See METHODOLOGY.md for every statistic and
              threshold.
            </footer>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
