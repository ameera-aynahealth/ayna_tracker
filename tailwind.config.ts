import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#F7F1E8",
        surface: "#FFFFFF",
        "surface-sunk": "#F1E9DC",
        border: "#E7DBC8",
        "border-strong": "#D8C7AC",
        "text-primary": "#2B2119",
        "text-secondary": "#7C6E5D",
        "text-muted": "#A79A87",
        accent: { DEFAULT: "#A8532B", soft: "#F3E1D3", text: "#7C3D1F" },
        sage: { DEFAULT: "#66785A", soft: "#E6EBDF", text: "#48583F" },
        gold: { DEFAULT: "#B5842A", soft: "#F3E7CD", text: "#7C5A1B" },
        brick: { DEFAULT: "#B0432E", soft: "#F5DFD8", text: "#7C2D1D" },
        plum: { DEFAULT: "#7C5A8A", soft: "#EBE1EF", text: "#553B61" },
      },
      fontFamily: {
        voice: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
