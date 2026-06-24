import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SimpleDistance — Golf Stock Yardages & Bag Optimization",
    short_name: "SimpleDistance",
    description:
      "Find your true stock yardages and optimize your bag — separating real trends from session noise. Works offline; data stays in your browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2f9e54",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
