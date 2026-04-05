/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './registry/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Color Palette - Scentbird-inspired premium design
      colors: {
        // Dark colors for navigation and headers
        dark: {
          900: '#0A0A0A',  // Pure black for navigation
          800: '#1A1A1A',  // Dark gray for footer
          700: '#2A2A2A',  // Hover states
          600: '#3A3A3A',  // Subtle borders
          500: '#4A4A4A',  // Muted text
        },
        
        // Warm earth tones (primary brand colors)
        terracotta: {
          50: '#FDF6F3',
          100: '#F8E8E0',
          200: '#F0D1C1',
          300: '#E8B9A2',
          400: '#D4A574',  // Accent amber
          500: '#B85A3A',  // Primary terracotta
          600: '#A04D2F',
          700: '#7A3A23',
          800: '#5A2A1A',
          900: '#3A1A10',
        },
        
        // Accent sage colors
        sage: {
          50: '#F5F7F4',
          100: '#E8EDE6',
          200: '#D1DBC9',
          300: '#B5C4A8',
          400: '#9AAD8A',
          500: '#8B9E7E',  // Accent sage
          600: '#6D7D63',
          700: '#525E4A',
          800: '#3A4235',
          900: '#252A22',
        },
        
        // Neutral colors (mapped to palette)
        sand: '#FDF6F3',   // terracotta-50
        cream: '#F8E8E0',  // terracotta-100

        // Legacy primary (for backward compatibility)
        primary: {
          DEFAULT: '#B85A3A',
          light: '#D4A574',  // terracotta-400
          dark: '#A04D2F',   // terracotta-600
        },

        // Legacy accent (for backward compatibility)
        accent: {
          amber: '#D4A574',
          sage: '#8B9E7E',
          sand: '#FDF6F3',   // terracotta-50
          cream: '#F8E8E0',  // terracotta-100
        },
        
        // Legacy neutral (for backward compatibility): darker for readability
        neutral: {
          900: '#1A1A1A',
          800: '#2A2A2A',
          700: '#3A3A3A',
          600: '#404040',
          500: '#525252',
          400: '#5C5A52',
          300: '#B0B0B0',
          200: '#E5E5E5',
          100: '#F0F0F0',
          50: '#FAFAFA',
        },
        
        // Semantic colors
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },

        /* shadcn Sidebar: used by components/ui/sidebar.tsx */
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      
      // Typography - next/font variables from layout (fallback to names if not set)
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-poppins)', 'Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      
      // Font sizes with line heights
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
        '5xl': ['48px', { lineHeight: '1' }],
        '6xl': ['60px', { lineHeight: '1' }],
        '7xl': ['72px', { lineHeight: '1' }],
      },
      
      // Spacing scale
      spacing: {
        '13': '52px',
        '15': '60px',
        '18': '72px',
        '22': '88px',
        '26': '104px',
        '30': '120px',
        '34': '136px',
        '38': '152px',
      },
      
      // Border radius
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
      },
      
      // Box shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'dropdown': '0 10px 40px rgba(0, 0, 0, 0.15)',
      },
      
      // Transition durations
      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '300ms',
        'slow': '500ms',
      },
      
      // Transition timing functions
      transitionTimingFunction: {
        'DEFAULT': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'in': 'cubic-bezier(0.4, 0, 1, 1)',
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      // Letter spacing
      letterSpacing: {
        'tighter': '-0.02em',
        'tight': '-0.01em',
        'normal': '0',
        'wide': '0.01em',
        'wider': '0.02em',
      },
      
      // Height for buttons
      height: {
        '9': '36px',   // Small button
        '11': '44px',  // Medium button
        '13': '52px',  // Large button
      },
      
      // Min height
      minHeight: {
        'hero-mobile': '400px',
        'hero-desktop': '600px',
      },
      
      // Max width
      maxWidth: {
        'search': '800px',
        'content': '600px',
      },
      
      // Z-index
      zIndex: {
        'dropdown': '50',
        'sticky': '100',
        'modal': '200',
        'toast': '300',
      },
      
      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        /** Magic UI–style flowing gradient for text + border pills */
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      
      // Animations
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'spin': 'spin 0.6s linear infinite',
        gradient: 'gradient 4s linear infinite',
      },
    },
  },
  plugins: [],
}
