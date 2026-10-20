/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cfx: {
          canvas: '#F7F8FA',
          surface: '#FFFFFF',
          'surface-elevated': '#F0F2F4',
          border: '#DCE2E8',
          'border-subtle': '#E9EDF2',
          'text-primary': '#202733',
          'text-secondary': '#566274',
          'text-muted': '#8492A6',
          accent: '#2563EB',
          'accent-hover': '#1D4ED8',
          'accent-subtle': 'rgba(37, 99, 235, 0.10)',
          success: '#16A34A',
          'success-subtle': 'rgba(22, 163, 74, 0.10)',
          warning: '#D97706',
          'warning-subtle': 'rgba(217, 119, 6, 0.10)',
          danger: '#DC2626',
          'danger-subtle': 'rgba(220, 38, 38, 0.10)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'cfx-elevated': '0 8px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'cfx-header': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};

