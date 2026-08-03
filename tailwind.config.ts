import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', sm: '1.75rem', lg: '2.5rem', '2xl': '3rem' },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1440px' },
    },
    extend: {
      screens: {
        /* Widths at which the ten-item horizontal nav actually fits.
           Malayalam labels are wider, so they need their own threshold. */
        nav: '1440px',
        'nav-ml': '1600px',
      },
      colors: {
        /* Deep Vatican blue — the spine of the palette */
        navy: {
          50: '#EEF2F9',
          100: '#D6E0EE',
          200: '#A9BCD9',
          300: '#7A94C0',
          400: '#4C6CA3',
          500: '#2C4B80',
          600: '#1D3763',
          700: '#152949',
          800: '#101E36',
          900: '#0B1526',
          950: '#070E1A',
        },
        /* Gold leaf accents */
        gold: {
          50: '#FBF7EC',
          100: '#F4EAD0',
          200: '#E8D49F',
          300: '#DABE6E',
          400: '#C9A227',
          500: '#B08C1E',
          600: '#8E6F18',
          700: '#6B5312',
          800: '#493810',
          900: '#2C220A',
        },
        /* Warm stone / travertine */
        stone: {
          50: '#FBF8F3',
          100: '#F5EFE5',
          200: '#EBE2D3',
          300: '#DACEB9',
          400: '#C2B39A',
          500: '#A6957C',
          600: '#877762',
          700: '#685C4C',
          800: '#4A4137',
          900: '#2E2822',
        },
        /* Burgundy highlight — feasts, liturgical accents */
        burgundy: {
          50: '#FBF1F3',
          100: '#F4DDE1',
          200: '#E5B6BF',
          300: '#D08A98',
          400: '#B25A6D',
          500: '#8C2E43',
          600: '#711F33',
          700: '#571726',
          800: '#3C101A',
          900: '#250A11',
        },
        ink: '#080D18',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Playfair Display', 'Georgia', 'serif'],
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'Source Sans Pro', 'system-ui', 'sans-serif'],
        malayalam: ['var(--font-malayalam)', 'Noto Sans Malayalam', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        '7xl': ['4.5rem', { lineHeight: '1.05' }],
        '8xl': ['6rem', { lineHeight: '1.02' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      letterSpacing: {
        widest: '0.25em',
        sacred: '0.4em',
      },
      maxWidth: {
        prose: '68ch',
        '8xl': '88rem',
        '9xl': '104rem',
      },
      boxShadow: {
        sacred: '0 24px 70px -30px rgba(11, 21, 38, 0.45)',
        lift: '0 30px 80px -40px rgba(11, 21, 38, 0.65)',
        gold: '0 0 0 1px rgba(201, 162, 39, 0.35), 0 20px 50px -30px rgba(201,162,39,0.5)',
        inner_gold: 'inset 0 0 0 1px rgba(201, 162, 39, 0.28)',
      },
      backgroundImage: {
        'gold-line': 'linear-gradient(90deg, transparent, #C9A227 20%, #E8D49F 50%, #C9A227 80%, transparent)',
        'sacred-veil': 'linear-gradient(180deg, rgba(7,14,26,0.10) 0%, rgba(7,14,26,0.55) 55%, rgba(7,14,26,0.92) 100%)',
        'stone-grain':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.32'/%3E%3C/svg%3E\")",
      },
      transitionTimingFunction: {
        sacred: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'slow-zoom': { '0%': { transform: 'scale(1)' }, '100%': { transform: 'scale(1.08)' } },
        'candle-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 1.2s ease both',
        shimmer: 'shimmer 1.8s infinite',
        'slow-zoom': 'slow-zoom 22s ease-out forwards',
        'candle-glow': 'candle-glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
