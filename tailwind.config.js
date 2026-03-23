/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        obsidian: {
          900: '#060610',
          800: '#0a0a18',
          700: '#0e0e22',
          600: '#12122c',
          500: '#1a1a3e',
          400: '#252550',
        },
        card: {
          DEFAULT: '#111128',
          hover: '#161635',
          border: '#1e1e42',
        },
        primary: {
          50: '#ede9fe',
          100: '#ddd6fe',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#2e1065',
        },
        accent: {
          cyan: '#06b6d4',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
          pink: '#ec4899',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-obsidian': 'linear-gradient(135deg, #0a0a18 0%, #0e0e2e 50%, #0a0a18 100%)',
        'gradient-card': 'linear-gradient(135deg, #111128 0%, #13132e 100%)',
        'gradient-primary': 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
        'gradient-green': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-orange': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.5)',
        'glow-purple': '0 0 20px rgba(124,58,237,0.3)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'sidebar-collapse': '1024px',
        'dashboard': '1200px',
      },
      spacing: {
        'sidebar': '16rem',
        'sidebar-sm': '5rem',
        'header': '4.5rem',
      },
    },
  },
  plugins: [],
}
