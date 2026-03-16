import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        banditos: {
          red: "#C41E3A",
          orange: "#E85D26",
          gold: "#FFD700",
          yellow: "#FFC107",
          green: "#2D5016",
          cream: "#FFF8E7",
          dark: "#1A1A2E",
          brown: "#4A2C2A",
        },
      },
      fontFamily: {
        display: ['"Passion One"', "Impact", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
