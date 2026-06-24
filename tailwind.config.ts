import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fairway: {
          50: "#f0f7f1",
          100: "#dcede0",
          400: "#4caf6a",
          500: "#2f9e54",
          600: "#247d42",
          700: "#1d6335",
        },
        ink: {
          700: "#2b3440",
          800: "#1f262e",
          900: "#141a20",
        },
      },
    },
  },
  plugins: [],
};

export default config;
