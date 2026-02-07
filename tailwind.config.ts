import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--surface-canvas) / <alpha-value>)",
        paper: "rgb(var(--surface-paper) / <alpha-value>)",
        "paper-2": "rgb(var(--surface-paper-2) / <alpha-value>)",
        inset: "rgb(var(--surface-inset) / <alpha-value>)",
        "border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        "text-title": "rgb(var(--text-title) / <alpha-value>)",
        "text-body": "rgb(var(--text-body) / <alpha-value>)",
        "text-subtle": "rgb(var(--text-subtle) / <alpha-value>)",
        "text-inverse": "rgb(var(--text-inverse) / <alpha-value>)",
        "action-primary": "rgb(var(--action-primary-bg) / <alpha-value>)",
        "action-primary-hover": "rgb(var(--action-primary-hover) / <alpha-value>)",
        "action-primary-active": "rgb(var(--action-primary-active) / <alpha-value>)",
        "action-primary-fg": "rgb(var(--action-primary-fg) / <alpha-value>)",
        "action-secondary": "rgb(var(--action-secondary-bg) / <alpha-value>)",
        "action-secondary-hover": "rgb(var(--action-secondary-hover) / <alpha-value>)",
        "action-secondary-active": "rgb(var(--action-secondary-active) / <alpha-value>)",
        "action-secondary-fg": "rgb(var(--action-secondary-fg) / <alpha-value>)",
        "status-danger": "rgb(var(--status-danger) / <alpha-value>)",
        "status-danger-bg": "rgb(var(--status-danger-bg) / <alpha-value>)",
        "status-danger-border": "rgb(var(--status-danger-border) / <alpha-value>)",
        "status-success": "rgb(var(--status-success) / <alpha-value>)",
        "status-success-bg": "rgb(var(--status-success-bg) / <alpha-value>)",
        "status-success-border": "rgb(var(--status-success-border) / <alpha-value>)",
        "status-warning": "rgb(var(--status-warning) / <alpha-value>)",
        "status-warning-bg": "rgb(var(--status-warning-bg) / <alpha-value>)",
        "status-warning-border": "rgb(var(--status-warning-border) / <alpha-value>)",
        "status-info": "rgb(var(--status-info) / <alpha-value>)",
        "status-info-bg": "rgb(var(--status-info-bg) / <alpha-value>)",
        "status-info-border": "rgb(var(--status-info-border) / <alpha-value>)",
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
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)"
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)"
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        base: "var(--motion-base)",
        slow: "var(--motion-slow)"
      },
      fontSize: {
        display: ["var(--font-display)", { lineHeight: "var(--line-tight)", fontWeight: "700" }],
        h1: ["var(--font-h1)", { lineHeight: "var(--line-tight)", fontWeight: "700" }],
        h2: ["var(--font-h2)", { lineHeight: "var(--line-tight)", fontWeight: "700" }],
        h3: ["var(--font-h3)", { lineHeight: "var(--line-tight)", fontWeight: "600" }],
        body: ["var(--font-body)", { lineHeight: "var(--line-body)" }],
        caption: ["var(--font-caption)", { lineHeight: "1.4" }]
      }
    }
  },
  plugins: []
} satisfies Config;
