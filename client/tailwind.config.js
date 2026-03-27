export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#EF4444", // Red for emergency
        secondary: "#1F2937", // Dark gray
        accent: "#FCD34D" // Warning yellow
      }
    },
  },
  plugins: [],
}
