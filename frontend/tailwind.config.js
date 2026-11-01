/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Official Royal Navy & Professional Blue Brand Tokens
        brand: {
          navy: "#142B4A",        // Royal Navy
          deepNavy: "#0B1730",    // Deep Navy
          blue: "#2563EB",        // Professional Blue
          blueHover: "#1D4ED8",   // Blue Hover
          paleBlue: "#EFF6FF",    // Pale Blue
          white: "#FFFFFF",       // White
          // Compatibility aliases to seamlessly upgrade existing components
          gold: "#2563EB",
          goldHover: "#1D4ED8",
          goldPressed: "#1E40AF",
          midnight: "#0B1730",
          charcoal: "#142B4A",
          elevated: "#1E2D45",
        },
        // Light Theme Semantics
        light: {
          bg: "#F4F7FB",          // Page background
          card: "#FFFFFF",        // Surface/card
          elevated: "#FFFFFF",    // Elevated surface
          primary: "#172033",     // Primary text
          secondary: "#475569",   // Secondary text
          muted: "#64748B",       // Muted text
          border: "#DCE3EC",      // Border
          input: "#FFFFFF",       // Input background
          ring: "#2563EB",        // Focus ring
        },
        // Dark Theme Semantics
        dark: {
          bg: "#0B1730",          // Page background
          card: "#17243A",        // Surface/card
          elevated: "#1E2D45",    // Elevated surface
          primary: "#F8FAFC",     // Primary text
          secondary: "#CBD5E1",   // Secondary text
          muted: "#94A3B8",       // Muted text
          border: "#334155",      // Border
          input: "#101D32",       // Input background
          accent: "#60A5FA",      // Accent
          accentHover: "#93C5FD", // Accent hover
        },
        // Status Colours with Light and Dark Accessibility Variants
        status: {
          success: "#15803D",
          warning: "#B45309",
          error: "#B91C1C",
          danger: "#B91C1C",
          info: "#0369A1",
          darkSuccess: "#4ADE80",
          darkWarning: "#FBBF24",
          darkError: "#F87171",
          darkInfo: "#60A5FA",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        input: "8px",
        card: "12px",
        panel: "16px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(11, 23, 48, 0.05), 0 1px 2px -1px rgba(11, 23, 48, 0.05)",
        cardHover: "0 4px 6px -1px rgba(11, 23, 48, 0.08), 0 2px 4px -2px rgba(11, 23, 48, 0.08)",
        modal: "0 20px 25px -5px rgba(11, 23, 48, 0.1), 0 8px 10px -6px rgba(11, 23, 48, 0.1)",
      },
    },
  },
  plugins: [],
};
