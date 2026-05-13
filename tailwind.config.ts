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
        primary: {
          50: "#f0f5ff",
          100: "#e0ebff",
          200: "#b8d4fe",
          300: "#85b8fd",
          400: "#4a92fa",
          500: "#1a6df5",
          600: "#0a53d1",
          700: "#0c41aa",
          800: "#10388c",
          900: "#133174",
        },
      },
    },
  },
  plugins: [],
};
export default config;
