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
        abyss: {
          950: "#050914",
          900: "#091024",
          800: "#101B38",
          700: "#1A2B56",
        },
        stream: {
          cyan: "#00F2FE",
          teal: "#4FACFE",
          axolotl: "#FF6AD5",
          biolume: "#38EF7D",
          amber: "#FFB800",
        },
        // Bitlynn underwater pixel apartment palette (design concept canvas)
        bl: {
          deep: "#0A0C12",
          ink: "#0E0F13",
          panel: "#161821",
          raised: "#1C1F2B",
          line: "#262A38",
          wall: "#2B3550",
          rivet: "#2F4C75",
          steel: "#5D6B8A",
          text: "#F3F4F8",
          muted: "#A9AEC0",
          pink: "#F6A5C0",
          rose: "#E0457B",
          blush: "#FFD3E2",
          gill: "#EC7FA3",
          plum: "#2A1B2E",
          sea: "#0F3D66",
          glint: "#9ED8FF",
          sky: "#6FB8FF",
          aqua: "#6FE3FF",
          kelp: "#2FA37A",
          brass: "#C9A66B",
          lamp: "#FFD36B",
          fish: "#FF9F43",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        pixel: ["var(--font-pixel)", "var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

