const plugin = require('tailwindcss/plugin')
module.exports = {
  mode: "jit",
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        blueGray: {
          50: "#ebecee",
          100: "#d6d9dd",
          200: "#c2c6cc",
          300: "#adb3bb",
          400: "#99a0aa",
          500: "#858d99",
          600: "#707a88",
          700: "#5c6777",
          800: "#475466",
          900: "#334155",
        },
      },
      fontFamily: {
        sans: ["Nunito Sans"],
      },
    },
  },

  variants: {
    extend: {},
  },
  plugins: [require('tailwind-scrollbar'), plugin(function ({ addComponents, theme }) {
    const colors = theme('colors');

    Object.keys(colors).forEach((clr) => {
      const color = colors[clr];
      const mainColor = color[500] || color?.main || color;
      const hoverColor = color[600] || color?.dark || color;
      const extraLightColor = color[50] || color[100];
      const lightColor = color[100] || color?.light || color;
      const contrastColor = color?.contrastColor || '#fff';

      addComponents({
        '._tw_btn': {
          // Colors
          [`&.${clr}`]: {
            background: mainColor,
            color: contrastColor,
            borderColor: mainColor,

            '&:hover, &:focus': {
              background: hoverColor,
            },
            '&:focus': {
              boxShadow: `inset 0px 0px 0px 1.5px #ffffffc7`
            }
          },

          // Outlined Varient
          [`&.${clr}.outlined`]: {
            'border-color': mainColor,
            color: mainColor,
            background: 'transparent',

            '&:hover': {
              background: extraLightColor,
            },
            '&:focus': {
              boxShadow: `inset 0px 0px 5px 1px ${lightColor}`
            }
          },

          // Text Varient
          [`&.${clr}.text`]: {
            'border-color': extraLightColor,
            color: hoverColor,
            background: extraLightColor,

            '&:hover,&:focus': {
              background: lightColor,
            },
            '&:focus': {
              'border-color': mainColor,
            }
          },
        },
      });
    });
  }),],
};
