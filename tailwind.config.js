/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-canvas': '#F9F9FB',
        'brand-card': '#FFFFFF',
        'brand-border': '#E2E8F0',
        'brand-slate': '#0F2537',
        'brand-focus': '#2A6F86',
        'brand-accent': '#C25E2E',
        'brand-verified': '#1E6F50',
        'brand-warning': '#B47D14',
        // Official Indian Government / Jharkhand State Portal Tokens
        'gov-maroon': '#7A1B1B',
        'gov-gold': '#F8E7A2',
        'gov-navy': '#0A1C2A',
        'gov-blue': '#0B2545',
        'gov-dark': '#0B192C',
      },
    },
  },
  plugins: [],
};
