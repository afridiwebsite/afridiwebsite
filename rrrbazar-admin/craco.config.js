// craco.config.js
const path = require("path");

module.exports = {
  style: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
    },
  },
  webpack: {
    alias: {
      // react-apexcharts@1.9 declares `browser: dist/react-apexcharts.iife.min.js`
      // in package.json. The IIFE bundle assumes React is global and references
      // a bare `process`, which crashes inside CRA's webpack target. Force the
      // CJS bundle (what bundlers should actually use).
      "react-apexcharts$": path.resolve(
        __dirname,
        "node_modules/react-apexcharts/dist/react-apexcharts.cjs.js"
      ),
    },
  },
};
