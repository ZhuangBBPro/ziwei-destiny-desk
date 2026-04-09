import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        mist: "#f5efe4",
        gold: "#b6862c",
        lacquer: "#7e2c2c",
        jade: "#2f7b66",
      },
      boxShadow: {
        panel: "0 16px 40px rgba(31, 41, 55, 0.08)",
      },
      fontFamily: {
        sans: ["'Noto Sans SC'", "'PingFang SC'", "system-ui", "sans-serif"],
        serif: ["'Noto Serif SC'", "'STSong'", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
