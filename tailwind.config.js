/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // NativeWind on web throws if dark mode is "media" and the <html> class changes.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: "#22c87a",
      },
    },
  },
  plugins: [],
};
