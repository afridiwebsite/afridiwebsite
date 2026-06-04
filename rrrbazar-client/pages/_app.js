import Head from "next/head";
import App from "next/app";
import Router, { useRouter } from "next/router";
import Nprogress from "nprogress";
import "nprogress/nprogress.css";
import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import api, { getSiteSettings, getUserProfile } from "../api/api";
import { googleLogout } from "@react-oauth/google";
import AuthGuard from "../components/AuthGuard";
import Layout from "../components/layout/Layout";
import MobileAppBar from "../components/MobileAppBar";
import {
  __access_token_key,
  __user_key,
  __site_name_2,
  __site_name_label,
} from "../config/globalConfig";
import routes from "../config/routes";
import {
  getLocal,
  getSession,
  removeBoth,
  setLocal,
  setSession,
} from "../lib/localStorage";
import { hexToRgb } from "../helpers/helpers";
import "../styles/globals.scss";
import "../styles/why-choose.scss";

const queryClient = new QueryClient();

Nprogress.configure({
  showSpinner: false,
});

Router.events.on("routeChangeStart", () => Nprogress.start());
Router.events.on("routeChangeComplete", () => Nprogress.done());
Router.events.on("routeChangeError", () => Nprogress.done());

// Global context api
export const globalContext = React.createContext();

function MyApp({ Component, pageProps, initialSiteSettings }) {
  const router = useRouter();

  const user = getLocal(__user_key) || getSession(__user_key);
  const access_token =
    getLocal(__access_token_key) || getSession(__access_token_key);

  const [authUser, setAuthUser] = useState(user);
  const [accessToken, setAccessToken] = useState(access_token);
  const [isAuth, setIsAuth] = useState(authUser && accessToken ? true : false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Seed siteSettings from the SSR-resolved value so the favicon `<link>`
  // tags ship in the initial HTML. Most browsers lock onto whatever
  // favicon URL was present at first paint and ignore later mutations to
  // the `<link>` href, so resolving server-side is the only reliable way
  // to make an admin-configurable favicon stick in production.
  const [siteSettings, setSiteSettings] = useState(initialSiteSettings || null);

  // Sync user profile on mount to ensure wallet balance and other data is
  // fresh, even after a refresh.
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js").then(
          function (registration) {
            console.log(
              "Service Worker registration successful with scope: ",
              registration.scope
            );
          },
          function (err) {
            console.log("Service Worker registration failed: ", err);
          }
        );
      });
    }

    if (isAuth && accessToken) {
      getUserProfile()
        .then((res) => {
          const userObj = res?.data?.data;
          if (userObj) {
            updateAuthUserInfo(userObj);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Refresh siteSettings client-side too, so admin edits propagate without
  // a full reload. This is purely a freshness pass — the favicon was
  // already resolved server-side; we just keep colors / labels in sync.
  useEffect(() => {
    let mounted = true;
    getSiteSettings()
      .then((res) => {
        if (mounted && res?.data?.data) setSiteSettings(res.data.data);
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
      r.style.setProperty("--theme-primary", siteSettings.primary_color);
      const rgb = hexToRgb(siteSettings.primary_color);
      if (rgb) r.style.setProperty("--theme-primary-rgb", rgb);
    }
    if (siteSettings.secondary_color) {
      r.style.setProperty("--theme-secondary", siteSettings.secondary_color);
      const rgb = hexToRgb(siteSettings.secondary_color);
      if (rgb) r.style.setProperty("--theme-secondary-rgb", rgb);
    }
    if (siteSettings.accent_color) {
      r.style.setProperty("--theme-accent", siteSettings.accent_color);
      const rgb = hexToRgb(siteSettings.accent_color);
      if (rgb) r.style.setProperty("--theme-accent-rgb", rgb);
    }
  }, [siteSettings]);

  const setWhereItHas = (key, value) => {
    if (getSession(key)) return setSession(key, value);
    setLocal(key, value);
  };

  const signOut = () => {
    removeBoth(__user_key);
    removeBoth(__access_token_key);
    localStorage.removeItem("closed_notices");
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
    localStorage.removeItem("closed_notices");

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

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
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
    deferredPrompt,
    installPWA,
  };

  const isDisabledHeader = Component?.disabledHeader;
  const isDisabledFooter = Component?.disabledFooter;
  const isDisabledMobileAppBar = Component?.disabledMobileAppBar;

  console.log(siteSettings?.favicon_full_url, "favico");

  return (
    <>
      <Head>
        <title>
          {__site_name_2} | {__site_name_label}
        </title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href={"/favico.ico"} />
        <link rel="icon" href={"/favico.ico"} />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon-precomposed" href="/logo.png" />
        <meta name="theme-color" content="#000000" />
        <meta name="application-name" content="RRRBAZAR" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RRRBAZAR" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <globalContext.Provider value={glovalContextData}>
        <QueryClientProvider client={queryClient}>
          <Layout
            disabledHeader={isDisabledHeader}
            disabledFooter={isDisabledFooter}
          >
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

// Fetch site settings before the first paint so `siteSettings.favicon` (and
// the theme colors) are baked into the SSR HTML. Note: defining
// getInitialProps on _app opts the whole tree out of Next.js's Automatic
// Static Optimization — that's the intentional tradeoff for having a
// runtime-configurable favicon. The endpoint should stay small/cacheable.
MyApp.getInitialProps = async (appContext) => {
  const appProps = await App.getInitialProps(appContext);
  let initialSiteSettings = null;
  try {
    const res = await getSiteSettings();
    initialSiteSettings = res?.data?.data || null;
  } catch (e) {
    // If the API is down on render, fall back to the client-side
    // useEffect refetch — degraded experience but not a hard failure.
  }
  return { ...appProps, initialSiteSettings };
};

export default MyApp;
