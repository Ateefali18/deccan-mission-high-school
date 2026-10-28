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
        brand: {
          midnight: "#101827",
          charcoal: "#1C293B",
          elevated: "#243449",
          gold: "#C6A45A",
          goldHover: "#D5B76D",
          goldPressed: "#AD8A40",
        },
        light: {
          bg: "#F4F6FA",
          card: "#FFFFFF",
          primary: "#182235",
          secondary: "#526174",
          border: "#D9E0E9",
        },
        dark: {
          bg: "#101827",
          card: "#1C293B",
          elevated: "#243449",
          primary: "#F1F5F9",
          secondary: "#C1CBD8",
          border: "#39485B",
        },
        status: {
          success: "#15805D",
          warning: "#A86408",
          error: "#B42332",
          info: "#245E9A",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
