import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        banditos: {
          red: "#C41E3A",
          gold: "#FFD700",
          green: "#2D5016",
          cream: "#FFF8E7",
          dark: "#1A1A2E",
        },
      },
    },
  },
  plugins: [],
};

export default config;
