/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parede: '#EEEBE4',
        papel: '#FBFAF7',
        linho: '#E4E0D6',
        tinta: { DEFAULT: '#1F2528', 2: '#4A5257', 3: '#7B8286' },
        pinheiro: { DEFAULT: '#2E4A41', 2: '#3E6154', soft: '#DCE5DF' },
        latao: { DEFAULT: '#B08A3E', 2: '#8F6E2B', soft: '#F0E6CC' },
        rosa: { DEFAULT: '#B5766C', soft: '#F1DEDA' },
        alerta: '#A4412F',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        papel: '0 1px 1px rgba(31,37,40,.06), 0 6px 14px -6px rgba(31,37,40,.16)',
        erguido: '0 2px 2px rgba(31,37,40,.06), 0 18px 34px -14px rgba(31,37,40,.30)',
      },
      keyframes: {
        carimbo: {
          '0%': { opacity: '0', transform: 'scale(2.4) rotate(-26deg)' },
          '55%': { opacity: '1', transform: 'scale(.94) rotate(-9deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-12deg)' },
        },
        entrar: {
          from: { opacity: '0', transform: 'translateY(10px) scale(.985)' },
          to: { opacity: '1', transform: 'none' },
        },
        subir: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pendurar: {
          '0%': { opacity: '0', transform: 'translateY(-14px) rotate(var(--giro, 0deg))' },
          '100%': { opacity: '1', transform: 'rotate(var(--giro, 0deg))' },
        },
        girar: { to: { transform: 'rotate(360deg)' } },
        brilho: {
          '0%': { opacity: '0', transform: 'translateY(0) scale(.4)' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-120px) scale(1)' },
        },
      },
      animation: {
        carimbo: 'carimbo .7s cubic-bezier(.2,.9,.25,1) both',
        entrar: 'entrar .28s cubic-bezier(.2,.8,.2,1) both',
        subir: 'subir .5s cubic-bezier(.2,.8,.2,1) both',
        pendurar: 'pendurar .6s cubic-bezier(.2,.8,.2,1) both',
        girar: 'girar 1s linear infinite',
        brilho: 'brilho 2.4s ease-out both',
      },
    },
  },
  plugins: [],
}
