const plugin = require('tailwindcss/plugin');

module.exports = {
  mode: 'jit',
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xxs: '340px',
        xs: '400px',
      },
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          50: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          100: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          200: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          300: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          400: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          500: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          600: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          700: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          800: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
          900: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--theme-secondary-rgb) / <alpha-value>)',
          500: 'rgb(var(--theme-secondary-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--theme-accent-rgb) / <alpha-value>)',
          500: 'rgb(var(--theme-accent-rgb) / <alpha-value>)',
        },
        gray: {
          50: '#F5F5FD',
          100: '#EEEEF7',
          200: '#DDDDEF',
          300: '#B8B8CF',
          400: '#8A8AA0',
          500: '#505062',
          600: '#3A3A54',
          700: '#282846',
          800: '#191938',
          900: '#0F0F2F',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    plugin(function ({ addComponents, theme }) {
      const colors = theme('colors');

      addComponents({
        '._btn': {
          'font-size': '15px',
          padding: '8px 16px',
          transition: '200ms ease-in-out',
          'font-weight': '500',
          'border-width': '1px',
          'border-radius': '6px',
          outline: 'none',
          'text-decoration': 'none',
          'user-select': 'none',
          position: 'relative',
          display: 'inline-block',

          // Sizes
          '&.extra_small': {
            'font-size': '10px',
            padding: '4px 10px',
            borderRadius: '3px',
          },
          '&.small': {
            'font-size': '13px',
            padding: '6px 12px',
            borderRadius: '4px',
          },
          '&.large': {
            'font-size': '17px',
            padding: '10px 20px',
          },

          // Disabled
          '&:disabled': {
            opacity: '0.4 !important',
            'pointer-events': 'none !important',
          },

          '&:disabled._btn_laoding': {
            opacity: '1 !important',
          },
        },
      });

      Object.keys(colors).forEach((color) => {
        const colorObject = colors[color];
        if (!colorObject || typeof colorObject !== 'object') return;

        const mainColorRaw = colorObject[500] || colorObject?.main || colorObject;
        const hoverColorRaw = colorObject[600] || colorObject?.dark || colorObject;
        const lightColorRaw = colorObject[100] || colorObject?.light || colorObject;
        const contrastColor = colorObject?.contrastColor || '#fff';

        const mainColor = typeof mainColorRaw === 'string' ? mainColorRaw.replace('<alpha-value>', '1') : mainColorRaw;
        const hoverColor = typeof hoverColorRaw === 'string' ? hoverColorRaw.replace('<alpha-value>', '1') : hoverColorRaw;
        const lightColor = typeof lightColorRaw === 'string' ? lightColorRaw.replace('<alpha-value>', '1') : lightColorRaw;

        const isPrimary = color === 'primary' ? ', &.primary' : '';

        addComponents({
          '._btn': {
            ...(isPrimary && {
              background: mainColor,
              color: contrastColor,

              '&:hover': {
                background: hoverColor,
              },
            }),

            // Colors
            [`&.${color}`]: {
              background: mainColor,
              color: contrastColor,

              '&:hover': {
                background: hoverColor,
              },
            },

            // Outlined Varient
            [`&.${color}.outlined ${isPrimary ? ', &.outlined' : ''}`]: {
              'border-color': mainColor,
              color: mainColor,
              background: contrastColor,

              '&:hover': {
                background: lightColor,
              },
            },

            // Text Varient
            [`&.${color}.text ${isPrimary ? ', &.text' : ''}`]: {
              'border-color': 'transparent',
              color: mainColor,
              background: 'transparent',

              '&:hover': {
                background: lightColor,
              },
            },
          },
        });
      });
    }),
  ],
};
