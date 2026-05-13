import axios from 'axios';
import router from 'next/router';
import {
  __access_token_key,
  __reset_password_data_key,
  __user_key,
} from '../config/globalConfig';
import routes from '../config/routes';
import { addRedirectQuery, setFlashMessage } from '../helpers/helpers';
import { getLocal, getSession, removeBoth } from '../lib/localStorage';

const access_token =
  getLocal(__access_token_key) || getSession(__access_token_key);

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { Authorization: `Bearer ${access_token}` },
});

api.interceptors.response.use(undefined, (err) => {
  const responseErrorAction = err?.response?.data?.action;

  if (responseErrorAction === 'logout') {
    removeBoth(__user_key);
    removeBoth(__access_token_key);
    setFlashMessage('Your session has expired, Please login again');
    router.push(routes.login.name + addRedirectQuery(router));
  }

  return Promise.reject(err);
});

export const getUserEarnWallet = async () => api.get('/my-earn-wallet');
export const getPaymentMethod = async () => api.get('/payment-method');
export const getUserProfile = async () => api.get('/user/profile');
export const getUserTransactions = async () => api.get('/usertransaction');
export const getUserWithdrawRequest = async () =>
  api.get('/user-withdraw-request');
export const getUserOrders = async () => api.get('/myorder');
export const getPopupNotice = async () => api.get('/notice-modal');
export const getHeaderNotice = async () => api.get('/notice-header');
export const getMyShopLists = async ({ pageParam = 1 }) =>
  api.get(`/my-shop-lists?page=${pageParam}`);

export const getProductOrders = async (product_id) => api.get(`/product-orders/${product_id}`);
export const getPlayerName = async (playerid) => api.get(`/get-player-name/${playerid}`);
export const getTopupPackage = async (id) => api.get(`/topuppackage/${id}`);
export const getTournamentById = async (id) => api.get(`/tournament/${id}`);
export const getTournamentWinners = async (id) =>
  api.get(`/tournament/winners/${id}`);
export const getTournamentTotalJoined = async (id) =>
  api.get(`/tournament-total-joined/${id}`);
export const getTournamentUserJoinedAlready = async () =>
  api.get(`/tournaments/user-joined-already`);
export const getTournamentRoomDetails = async (id) =>
  api.get(`/tournaments/room-details/${id}`);
export const getTournamentParticipantsById = async (id) =>
  api.get(`/tournaments/participants/${id}`);
export const getHomeTournament = async () => api.get('/home-tournament');

export const getSiteSettings = async () => api.get('/site-settings');
export const getCategoriesPublic = async () => api.get('/categories');
export const getTopupProductsWithCategories = async () =>
  api.get('/topup-products-with-categories');

export const getMyCoins = async () => api.get('/coins/me');
export const claimCoins = async () => api.post('/coins/claim');
export const convertCoins = async (amount) =>
  api.post('/coins/convert', { amount });
export const getCoinHistory = async () => api.get('/coins/history');

// Spin / gacha
export const getSpinOverview = async () => api.get('/spin/overview');
export const doSpin = async () => api.post('/spin/spin');
export const getSpinHistory = async () => api.get('/spin/history');

export const reSendOtp = async () => {
  const data = getSession(__reset_password_data_key);
  const user_id = data?.user?.id;

  if (!user_id) return undefined;
  return api.get(`/reset-password-otp/${user_id}`);
};

export default api;
