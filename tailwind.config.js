/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        baseBlue: "#0052FF",
        baseBg: "#0B0D12",
        baseCard: "#11141A",
        baseStroke: "#1B2130"
      },
      borderRadius: {
        xl2: "1rem"
      }
    }
  },
  plugins: []
};
