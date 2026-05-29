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
        'tu-red': '#800000',
        'tu-red-light': '#9c1c1c',
        'tu-red-dark': '#4a0404',
      },
    },
  },
  plugins: [],
};
export default config;