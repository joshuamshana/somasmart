import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        surface2: "rgb(var(--color-surface-2) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        "brand-contrast": "rgb(var(--color-brand-contrast) / <alpha-value>)",
        link: "rgb(var(--color-link) / <alpha-value>)",
        "link-hover": "rgb(var(--color-link-hover) / <alpha-value>)",
        overlay: "rgb(var(--color-overlay) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
        "danger-surface": "rgb(var(--color-danger-surface) / <alpha-value>)",
        "danger-border": "rgb(var(--color-danger-border) / <alpha-value>)",
        "danger-text": "rgb(var(--color-danger-text) / <alpha-value>)",
        "success-surface": "rgb(var(--color-success-surface) / <alpha-value>)",
        "success-border": "rgb(var(--color-success-border) / <alpha-value>)",
        "success-text": "rgb(var(--color-success-text) / <alpha-value>)",
        "warning-surface": "rgb(var(--color-warning-surface) / <alpha-value>)",
        "warning-border": "rgb(var(--color-warning-border) / <alpha-value>)",
        "warning-text": "rgb(var(--color-warning-text) / <alpha-value>)",
        "info-surface": "rgb(var(--color-info-surface) / <alpha-value>)",
        "info-border": "rgb(var(--color-info-border) / <alpha-value>)",
        "info-text": "rgb(var(--color-info-text) / <alpha-value>)"
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)"
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)"
      }
    }
  },
  plugins: []
} satisfies Config;
