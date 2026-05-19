import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import Nprogress from 'nprogress';
import 'nprogress/nprogress.css';
import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import api, { getSiteSettings } from '../api/api';
import { googleLogout } from '@react-oauth/google';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/layout/Layout';
import MobileAppBar from '../components/MobileAppBar';
import { __access_token_key, __user_key, __site_name_2, __site_name_label } from '../config/globalConfig';
import routes from '../config/routes';
import {
  getLocal,
  getSession,
  removeBoth,
  setLocal,
  setSession,
} from '../lib/localStorage';
import { hexToRgb } from '../helpers/helpers';
import '../styles/globals.scss';
import '../styles/why-choose.scss';

const queryClient = new QueryClient();

Nprogress.configure({
  showSpinner: false,
});

Router.events.on('routeChangeStart', () => Nprogress.start());
Router.events.on('routeChangeComplete', () => Nprogress.done());
Router.events.on('routeChangeError', () => Nprogress.done());

// Global context api
export const globalContext = React.createContext();

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const user = getLocal(__user_key) || getSession(__user_key);
  const access_token =
    getLocal(__access_token_key) || getSession(__access_token_key);

  const [authUser, setAuthUser] = useState(user);
  const [accessToken, setAccessToken] = useState(access_token);
  const [isAuth, setIsAuth] = useState(authUser && accessToken ? true : false);
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    let mounted = true;
    getSiteSettings()
      .then((res) => {
        if (mounted) setSiteSettings(res?.data?.data || null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!siteSettings) return;
    const r = document.documentElement;
    if (siteSettings.primary_color) {
      r.style.setProperty('--theme-primary', siteSettings.primary_color);
      const rgb = hexToRgb(siteSettings.primary_color);
      if (rgb) r.style.setProperty('--theme-primary-rgb', rgb);
    }
    if (siteSettings.secondary_color) {
      r.style.setProperty('--theme-secondary', siteSettings.secondary_color);
      const rgb = hexToRgb(siteSettings.secondary_color);
      if (rgb) r.style.setProperty('--theme-secondary-rgb', rgb);
    }
    if (siteSettings.accent_color) {
      r.style.setProperty('--theme-accent', siteSettings.accent_color);
      const rgb = hexToRgb(siteSettings.accent_color);
      if (rgb) r.style.setProperty('--theme-accent-rgb', rgb);
    }
  }, [siteSettings]);

  const setWhereItHas = (key, value) => {
    if (getSession(key)) return setSession(key, value);
    setLocal(key, value);
  };

  const signOut = () => {
    removeBoth(__user_key);
    removeBoth(__access_token_key);
    localStorage.removeItem('closed_notices');
    googleLogout();
    router.push(routes.login.name).then(() => {
      setIsAuth(false);
      setAuthUser(null);
      setAccessToken(null);
    });
  };

  const saveAuthUser = (userObj, accessToken, rememberMe, redirectUrl) => {
    removeBoth(__user_key);
    removeBoth(__access_token_key);
    localStorage.removeItem('closed_notices');

    if (rememberMe) {
      setLocal(__user_key, userObj);
      setLocal(__access_token_key, accessToken);
    } else {
      setSession(__user_key, userObj);
      setSession(__access_token_key, accessToken);
    }

    // Adding accessToken to api interceptor
    api.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });

    setAuthUser(userObj);
    setAccessToken(accessToken);
    setIsAuth(true);

    router.push(redirectUrl || routes.profile.name);
  };

  const updateAuthUserInfo = (userObj) => {
    setWhereItHas(__user_key, userObj);
    setAuthUser(userObj);
  };

  const glovalContextData = {
    authUser,
    accessToken,
    isAuth,
    signOut,
    saveAuthUser,
    updateAuthUserInfo,
    siteSettings,
    setSiteSettings,
  };

  const isDisabledHeader = Component?.disabledHeader;
  const isDisabledFooter = Component?.disabledFooter;
  const isDisabledMobileAppBar = Component?.disabledMobileAppBar;

  return (
    <>
      <Head>
        <title>{__site_name_2} | {__site_name_label}</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon48x48.ico" />
        <link rel="icon" href="/favicon48x48.ico" />
        <link rel="apple-touch-icon" href="/favicon144x144.ico" />
        <link rel="apple-touch-icon-precomposed" href="/favicon144x144.ico" />
        <meta name="theme-color" content="#fff" />
      </Head>
      <globalContext.Provider value={glovalContextData}>
        <QueryClientProvider client={queryClient}>
          <Layout disabledHeader={isDisabledHeader} disabledFooter={isDisabledFooter}>
            <ToastContainer />
            {Component.auth ? (
              <AuthGuard>
                <Component {...pageProps} />
              </AuthGuard>
            ) : (
              <Component {...pageProps} />
            )}
            {!isDisabledMobileAppBar && <MobileAppBar />}
          </Layout>
        </QueryClientProvider>
      </globalContext.Provider>
    </>
  );
}

export default MyApp;
