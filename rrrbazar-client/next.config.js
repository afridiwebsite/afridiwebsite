// const withPwa = require('next-pwa');
// module.exports = withPwa({
//   reactStrictMode: true,
//   images: {
//     domains: ['localhost', 'lh3.googleusercontent.com'],
//   },
//   pwa: {
//     dest: 'public',
//     register: true,
//     skipWaiting: true,
//   },
// });
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'lh3.googleusercontent.com'],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
})
