/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
