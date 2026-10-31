export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        
        dark: {
          bg: '#0a0f1d',        
          card: '#111827',      
          border: '#1f2937',    
          sidebar: '#0d1322',   
        },
        
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',       
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          glow: 'rgba(37, 99, 235, 0.4)' 
        },
        
        redBrand: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',       
          700: '#b91c1c',       
          800: '#991b1b',
        }
      }
    },
  },
  plugins: [],
}