/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eduPurple: '#3b3164', // El morado oscuro del menú activo
        eduBg: '#f8f9fa',     // El fondo gris claro del dashboard
      }
    },
  },
  plugins: [],
}