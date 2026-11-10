/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parede: 'rgb(var(--c-parede) / <alpha-value>)',
        papel: 'rgb(var(--c-papel) / <alpha-value>)',
        linho: 'rgb(var(--c-linho) / <alpha-value>)',
        tinta: { DEFAULT: 'rgb(var(--c-tinta) / <alpha-value>)', 2: 'rgb(var(--c-tinta-2) / <alpha-value>)', 3: 'rgb(var(--c-tinta-3) / <alpha-value>)' },
        pinheiro: { DEFAULT: 'rgb(var(--c-azul) / <alpha-value>)', 2: 'rgb(var(--c-azul-2) / <alpha-value>)', soft: 'rgb(var(--c-azul-soft) / <alpha-value>)' },
        latao: { DEFAULT: 'rgb(var(--c-ouro) / <alpha-value>)', 2: 'rgb(var(--c-ouro-2) / <alpha-value>)', soft: 'rgb(var(--c-ouro-soft) / <alpha-value>)' },
        rosa: { DEFAULT: 'rgb(var(--c-rosa) / <alpha-value>)', soft: 'rgb(var(--c-rosa-soft) / <alpha-value>)' },
        alerta: 'rgb(var(--c-alerta) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Albert Sans Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Albert Sans Variable"', 'system-ui', 'sans-serif'],
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
