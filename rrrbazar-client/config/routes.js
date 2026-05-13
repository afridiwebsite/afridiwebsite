const routes = Object.freeze({
  withdrawEarnWallet: {
    name: '/withdraw-earn-wallet',
  },
  login: {
    name: '/login',
  },
  register: {
    name: '/register',
  },
  forgotPassword: {
    name: '/forgot-password',
  },
  verifyOtp: {
    name: `/forgot-password/verify-otp`,
  },
  changePassword: {
    name: `/forgot-password/change-password`,
  },
  profile: {
    auth: true,
    name: '/profile',
  },
  settings: {
    auth: true,
    name: '/settings',
  },
  addMoney: {
    name: '/add-money',
  },
  topup: {
    name: '/topup',
  },
  tournament: {
    name: '/tournament',
  },
  joinTournament: {
    name: '/tournament/join',
  },
  shop: {
    name: '/shop',
  },
  contactUs: {
    name: '/contact-us',
  },
  myOrder: {
    name: '/profile/order',
  },
  myTransaction: {
    name: '/profile/transaction',
  },
  myShop: {
    name: '/profile/my-shop',
  },
});

export default routes;
