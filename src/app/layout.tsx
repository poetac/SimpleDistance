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
            <Nav />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
            <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-400">
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
