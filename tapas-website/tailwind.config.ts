import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          container: "var(--primary-container)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          container: "var(--secondary-container)",
          fixed: "var(--secondary-fixed)",
          "fixed-dim": "var(--secondary-fixed-dim)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          dim: "var(--surface-dim)",
          "container-lowest": "var(--surface-container-lowest)",
          "container-low": "var(--surface-container-low)",
          container: "var(--surface-container)",
          "container-high": "var(--surface-container-high)",
          "container-highest": "var(--surface-container-highest)",
          variant: "var(--surface-variant)",
        },
        "on-surface": {
          DEFAULT: "var(--on-surface)",
          variant: "var(--on-surface-variant)",
        },
        "on-primary": "var(--on-primary)",
        "on-primary-container": "var(--on-primary-container)",
        outline: {
          DEFAULT: "var(--outline)",
          variant: "var(--outline-variant)",
        },
        accent: {
          "warm-start": "var(--accent-warm-start)",
          "warm-end": "var(--accent-warm-end)",
          leather: "var(--accent-leather)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      fontSize: {
        "display-lg": "var(--text-display-lg)",
        "display-md": "var(--text-display-md)",
        "display-sm": "var(--text-display-sm)",
        "headline-lg": "var(--text-headline-lg)",
        "headline-md": "var(--text-headline-md)",
        "headline-sm": "var(--text-headline-sm)",
        "body-lg": "var(--text-body-lg)",
        "body-md": "var(--text-body-md)",
        "body-sm": "var(--text-body-sm)",
        "label-lg": "var(--text-label-lg)",
        "label-sm": "var(--text-label-sm)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      spacing: {
        "space-xs": "var(--space-xs)",
        "space-sm": "var(--space-sm)",
        "space-md": "var(--space-md)",
        "space-lg": "var(--space-lg)",
        "space-xl": "var(--space-xl)",
        "space-2xl": "var(--space-2xl)",
        "space-3xl": "var(--space-3xl)",
        "space-4xl": "var(--space-4xl)",
        "space-5xl": "var(--space-5xl)",
      },
      maxWidth: {
        content: "var(--content-max-width)",
      },
      boxShadow: {
        ambient: "var(--shadow-ambient)",
        float: "var(--shadow-float)",
      },
    },
  },
  plugins: [],
};
export default config;
