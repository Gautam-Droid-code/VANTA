import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    /**
     * `/lib` matters as much as the others: `lib/backdrops.ts` is the only
     * place the backdrop classes are written down. Leaving it out meant
     * Tailwind never saw `bg-flare-orange`, `bg-flare-sunset` or the graphite
     * gradient, so those utilities were never generated and every section
     * using them rendered with no backdrop at all. `bg-flare-red` survived
     * only by coincidence — the cart badge in `Navbar` uses it literally.
     */
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core surface + ink
        ink: {
          DEFAULT: "#0D0D0D", // near-black page background
          soft: "#141313", // secondary container
          raised: "#1C1B1B", // cards / rows
          line: "#2B2A2A", // hairline borders
        },
        bone: {
          DEFAULT: "#F5F5F0", // off-white foreground
          dim: "#C4C7C7", // muted body copy
          faint: "#8E9192", // labels, meta
        },
        // Editorial accents — used as photo backdrops, never as flat UI chrome
        flare: {
          red: "#C41E1E",
          "red-hot": "#E01414",
          orange: "#E8590C",
          "orange-hot": "#FF6A00",
        },
        /**
         * Admin dashboard palette — a separate visual system from the
         * storefront. Dark ink sidebar, light workspace, one orange accent.
         * Never mix these with `bone`/`ink` surface tokens in storefront code.
         */
        admin: {
          bg: "#F6F5F2", // workspace background
          surface: "#FFFFFF", // cards, panels, table rows
          "surface-alt": "#FBFAF8", // zebra / inset areas
          border: "#E4E2DC",
          "border-strong": "#CFCCC4",
          ink: "#141413", // primary text
          muted: "#6E6C66", // secondary text
          subtle: "#9B9891", // labels, placeholders
          accent: "#E8590C",
          "accent-hover": "#CC4C08",
          "accent-soft": "#FDF0E7", // tinted backgrounds for accent states
          danger: "#B3261E",
          success: "#1F7A44",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "sans-serif"],
        accent: ["var(--font-accent)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        /** Admin headings only — loaded on /admin routes. */
        "admin-display": ["var(--font-admin-display)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Editorial display scale — tight leading, negative tracking
        "display-sm": ["2.5rem", { lineHeight: "0.92", letterSpacing: "-0.02em" }],
        "display-md": ["3.5rem", { lineHeight: "0.9", letterSpacing: "-0.025em" }],
        "display-lg": ["5rem", { lineHeight: "0.88", letterSpacing: "-0.03em" }],
        "display-xl": ["7.5rem", { lineHeight: "0.86", letterSpacing: "-0.04em" }],
        label: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.18em" }],
        "label-lg": ["0.75rem", { lineHeight: "1", letterSpacing: "0.15em" }],
      },
      spacing: {
        gutter: "1.25rem", // 20px mobile margin
        "gutter-lg": "4rem", // 64px desktop margin
        section: "5rem",
        "section-lg": "10rem",
      },
      maxWidth: {
        container: "1440px",
      },
      backgroundImage: {
        "flare-red": "linear-gradient(160deg, #E01414 0%, #C41E1E 55%, #7A0D0D 100%)",
        "flare-orange": "linear-gradient(165deg, #FF6A00 0%, #E8590C 50%, #8A2F04 100%)",
        "flare-sunset": "linear-gradient(180deg, #FF8A00 0%, #E8590C 40%, #C41E1E 100%)",
      },
      transitionTimingFunction: {
        // Shared easing — entrances use `out`, hovers use `in-out`
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        "badge-pop": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "badge-pop": "badge-pop 240ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
