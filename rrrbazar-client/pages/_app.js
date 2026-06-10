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
import {
  geoConfig,
  organizationJsonLd,
  seoConfig,
  websiteJsonLd,
} from "../config/seoConfig";
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
  // The auth credential is now an httpOnly cookie that JS can't read, so login
  // state is derived from the persisted (non-sensitive) user object instead of
  // the token. Legacy sessions that still carry a token also resolve as authed.
  const [isAuth, setIsAuth] = useState(user ? true : false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  // Best-effort "is the PWA already installed" flag, surfaced via context so
  // the banner and the sidebar button can both hide reliably. See the install
  // detection effect below for the signals that feed it.
  const [isInstalled, setIsInstalled] = useState(false);
  // iOS has no install API/events, so we track it to fall back to the manual
  // "Add to Home Screen" hint instead of a (non-existent) install prompt.
  const [isIOS, setIsIOS] = useState(false);

  // Seed siteSettings from the SSR-resolved value so the favicon `<link>`
  // tags ship in the initial HTML. Most browsers lock onto whatever
  // favicon URL was present at first paint and ignore later mutations to
  // the `<link>` href, so resolving server-side is the only reliable way
  // to make an admin-configurable favicon stick in production.
  const [siteSettings, setSiteSettings] = useState(initialSiteSettings || null);

  // Sync user profile on mount to ensure wallet balance and other data is
  // fresh, even after a refresh.
  useEffect(() => {
    // ---- PWA install detection ------------------------------------------
    // Visibility is driven by *live* install state, not a one-time
    // "shown" flag. Two earlier bugs this avoids:
    //   1. a permanent `pwa_banner_shown` flag meant the banner could only
    //      ever appear once — so it was effectively blocked forever;
    //   2. the persisted `pwa_installed` flag was never cleared, so after
    //      the user *uninstalled* the app it still looked installed and the
    //      banner / sidebar button never came back.
    //
    // The persisted `pwa_installed` flag is now only ever written on
    // Chromium (via appinstalled / getInstalledRelatedApps) and is
    // self-correcting there: the same getInstalledRelatedApps probe clears
    // it the moment the app is no longer installed. iOS never persists it
    // (no install API), so its banner simply tracks standalone mode and can
    // never get stuck. Dismissals are session-scoped (see closeInstallBanner)
    // so "Later" stops the nag for this visit without silencing it forever.

    // Running as the installed PWA (Android/desktop standalone, iOS
    // navigator.standalone, or TWA via the android-app referrer).
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.startsWith("android-app://");

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const bannerDismissedThisSession = () => {
      try {
        return sessionStorage.getItem("pwa_banner_dismissed") === "1";
      } catch (e) {
        return false;
      }
    };

    // Show the banner unless the user dismissed it earlier this session.
    const maybeShowBanner = () => {
      if (bannerDismissedThisSession()) return;
      setShowInstallBanner(true);
    };

    const markInstalled = () => {
      try {
        localStorage.setItem("pwa_installed", "1");
      } catch (e) {
        /* localStorage may be unavailable (private mode) — non-fatal */
      }
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    // Drop the stale "installed" flag — used when the live probe (or a fresh
    // beforeinstallprompt) tells us the app is no longer installed, e.g. the
    // user uninstalled it since the last visit.
    const clearInstalledFlag = () => {
      try {
        localStorage.removeItem("pwa_installed");
      } catch (e) {
        /* ignore */
      }
      setIsInstalled(false);
    };

    const handleBeforeInstallPrompt = (e) => {
      // beforeinstallprompt only fires when the app is installable AND NOT
      // already installed — so any persisted "installed" flag is stale
      // (the user uninstalled). Clear it, then offer the install.
      e.preventDefault();
      clearInstalledFlag();
      setDeferredPrompt(e);
      maybeShowBanner();
    };

    // Fired by the browser the moment the PWA finishes installing.
    const handleAppInstalled = () => {
      markInstalled();
    };

    if (isStandalone) {
      // Definitively running inside the installed app — never nag here.
      setIsInstalled(true);
      setShowInstallBanner(false);
    } else {
      // Fast-path hint from a previous Chromium install so installed users
      // don't see a banner flash before the live probe resolves. Only
      // Chromium ever writes this, and getInstalledRelatedApps below clears
      // it if the app turns out to be gone.
      let storedInstalled = false;
      try {
        storedInstalled = localStorage.getItem("pwa_installed") === "1";
      } catch (e) {
        /* ignore */
      }
      if (storedInstalled) setIsInstalled(true);

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      // Chrome/Android source of truth: ask the browser directly. Non-empty
      // => installed (persist + hide); empty => not installed, so clear any
      // stale flag and let the banner/button reappear (uninstall recovery).
      if (typeof navigator.getInstalledRelatedApps === "function") {
        navigator
          .getInstalledRelatedApps()
          .then((apps) => {
            if (Array.isArray(apps) && apps.length > 0) markInstalled();
            else clearInstalledFlag();
          })
          .catch(() => {});
      }

      // iOS Safari has no beforeinstallprompt / appinstalled / install API,
      // so the only signal is standalone mode (handled above). When not
      // standalone we show the manual "Add to Home Screen" hint; it tracks
      // live state, so uninstalling and reopening in Safari shows it again.
      if (isIOSDevice) {
        maybeShowBanner();
      }
    }

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js").then(
          function (registration) {
            console.log(
              "Service Worker registration successful with scope: ",
              registration.scope,
            );
          },
          function (err) {
            console.log("Service Worker registration failed: ", err);
          },
        );
      });
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (isAuth) {
      getUserProfile()
        .then((res) => {
          const userObj = res?.data?.data;
          if (userObj) {
            updateAuthUserInfo(userObj);
          }
        })
        .catch(() => {});
    }
  }, [isAuth]);

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

  const setWhereItHas = React.useCallback((key, value) => {
    if (getSession(key)) return setSession(key, value);
    setLocal(key, value);
  }, []);

  const signOut = () => {
    // Clear the httpOnly auth cookie server-side; JS can't remove it itself.
    // Fire-and-forget — local state is cleared regardless of the result.
    api.post("/logout").catch(() => {});
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

    // The token is no longer persisted — it lives in a Secure httpOnly cookie
    // the API sets on login. We only persist the (non-sensitive) user object,
    // and always in localStorage so login state survives the external
    // payment-portal redirect and any new tab/context the provider returns in.
    setLocal(__user_key, userObj);

    setAuthUser(userObj);
    setAccessToken(null);
    setIsAuth(true);

    router.push(redirectUrl || routes.profile.name);
  };

  const updateAuthUserInfo = React.useCallback(
    (userObj) => {
      setWhereItHas(__user_key, userObj);
      setAuthUser(userObj);
    },
    [setWhereItHas],
  );

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // Re-open the banner on demand (e.g. iOS user taps "Install App" in the
  // sidebar). iOS has no install prompt, so the banner's Share→Add-to-Home
  // hint is the only thing we can offer.
  const showInstallInstructions = () => setShowInstallBanner(true);

  const closeInstallBanner = () => {
    // Session-scoped dismissal: "Later" hides the banner for this visit but
    // it returns on a future session (or after an uninstall/reinstall). This
    // is deliberately NOT persisted to localStorage — a permanent flag was
    // what previously blocked the banner from ever showing again.
    try {
      sessionStorage.setItem("pwa_banner_dismissed", "1");
    } catch (e) {
      /* sessionStorage unavailable — fall back to in-session hide */
    }
    setShowInstallBanner(false);
    // Keep deferredPrompt so the sidebar "Install App" button still works
    // after the banner is dismissed; only the banner is hidden here.
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
    isInstalled,
    isIOS,
    showInstallInstructions,
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        {/* Site-wide SEO defaults. Pages render <SEO /> with matching `key`
            props, so any of these get overridden per page when provided. */}
        <meta name="description" content={seoConfig.description} key="description" />
        <meta name="keywords" content={seoConfig.keywords} key="keywords" />
        <meta name="robots" content="index, follow" key="robots" />

        {/* Open Graph defaults */}
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:site_name" content={seoConfig.siteName} key="og:site_name" />
        <meta property="og:title" content={seoConfig.defaultTitle} key="og:title" />
        <meta property="og:description" content={seoConfig.description} key="og:description" />
        <meta property="og:image" content={seoConfig.ogImage} key="og:image" />
        <meta property="og:locale" content={seoConfig.locale} key="og:locale" />
        <meta
          property="og:locale:alternate"
          content={seoConfig.localeAlternate}
          key="og:locale:alternate"
        />

        {/* Twitter defaults */}
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:site" content={seoConfig.twitterHandle} key="twitter:site" />
        <meta name="twitter:title" content={seoConfig.defaultTitle} key="twitter:title" />
        <meta name="twitter:description" content={seoConfig.description} key="twitter:description" />
        <meta name="twitter:image" content={seoConfig.ogImage} key="twitter:image" />

        {/* Geo / location — Bangladesh */}
        <meta name="geo.region" content={geoConfig.region} key="geo.region" />
        <meta name="geo.placename" content={geoConfig.placename} key="geo.placename" />
        <meta
          name="geo.position"
          content={`${geoConfig.latitude};${geoConfig.longitude}`}
          key="geo.position"
        />
        <meta
          name="ICBM"
          content={`${geoConfig.latitude}, ${geoConfig.longitude}`}
          key="ICBM"
        />

        {/* Structured data — storefront + on-site search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />

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
          {/* Developer notice — a static, env-driven banner pinned to the very
              top of every page. Set NEXT_PUBLIC_DEV_NOTICE in .env to show it;
              leave it unset/empty to hide the bar entirely. */}
          {process.env.NEXT_PUBLIC_DEV_NOTICE ? (
            <div
              role="status"
              style={{
                width: "100%",
                textAlign: "center",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: 1.4,
                color: "#ffffff",
                background: "#b45309",
                position: "relative",
                zIndex: 100000,
              }}
            >
              {process.env.NEXT_PUBLIC_DEV_NOTICE}
            </div>
          ) : null}
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

            {showInstallBanner && !isInstalled && (
              <div
                className="pwa-install-banner"
                style={{
                  position: "fixed",
                  bottom: !isDisabledMobileAppBar
                    ? "calc(80px + env(safe-area-inset-bottom, 0px))"
                    : "20px",
                  left: "15px",
                  right: "15px",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  animation: "banner-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                   
                   
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/logo-app.jpeg"
                    alt="App Icon"
                    style={{ width: "28px", height: "28px", objectFit: "contain" }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#1e293b",
                      marginBottom: "2px",
                    }}
                  >
                    Install {siteSettings?.site_name || __site_name_2}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream 
                      ? "Tap Share > Add to Home Screen" 
                      : "Add to home screen for fast access"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    onClick={closeInstallBanner}
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#94a3b8",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Later
                  </button>
                  {deferredPrompt && (
                    <button
                      onClick={installPWA}
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#fff",
                        background: "var(--theme-primary, #3b82f6)",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        boxShadow: "0 4px 10px rgba(59, 130, 246, 0.2)",
                      }}
                    >
                      Install
                    </button>
                  )}
                </div>

                <style jsx>{`
                  @keyframes banner-slide-up {
                    from {
                      transform: translateY(100px);
                      opacity: 0;
                    }
                    to {
                      transform: translateY(0);
                      opacity: 1;
                    }
                  }
                  @media (min-width: 768px) {
                    .pwa-install-banner {
                      max-width: 400px;
                      left: auto !important;
                      right: 20px !important;
                      bottom: 20px !important;
                    }
                  }
                `}</style>
              </div>
            )}
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
