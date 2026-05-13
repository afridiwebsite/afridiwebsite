import Head from 'next/head';
import Link from 'next/link';
import { useContext, useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import {
  FaShieldAlt, FaBolt, FaLock,
  FaCoins, FaGamepad, FaRocket, FaTrophy, FaGem, FaStar,
} from 'react-icons/fa';
import {
  GiTwoCoins, GiConsoleController, GiCardJoker, GiDiamonds,
} from 'react-icons/gi';
import { HiSparkles } from 'react-icons/hi';
import api from '../api/api';
import Alert from '../components/Alert';
import CircularProgress from '../components/CircularProgress';
import { __page_title_end } from '../config/globalConfig';
import { getErrors } from '../helpers/helpers';
import { globalContext } from './_app';

const FEATURES = [
  { Icon: FaShieldAlt, label: 'Secure',  tint: 'emerald' },
  { Icon: FaBolt,      label: 'Fast',    tint: 'blue'    },
  { Icon: FaLock,      label: 'Private', tint: 'purple'  },
];

// Background decoration — hand-tuned scatter so we don't fight the card.
// Kept static (not Math.random) so SSR markup matches the client render.
const FLOATING_ICONS = [
  { Icon: FaCoins,             top: '6%',  left: '7%',  size: 30, delay: 0,   duration: 7, color: '#f59e0b' },
  { Icon: FaGamepad,           top: '12%', left: '86%', size: 34, delay: 1.2, duration: 8, color: '#6366f1' },
  { Icon: GiTwoCoins,          top: '22%', left: '14%', size: 38, delay: 2.4, duration: 6, color: '#f97316' },
  { Icon: GiConsoleController, top: '28%', left: '80%', size: 32, delay: 0.6, duration: 9, color: '#10b981' },
  { Icon: HiSparkles,          top: '36%', left: '4%',  size: 22, delay: 3.0, duration: 6, color: '#fbbf24' },
  { Icon: FaGem,               top: '42%', left: '90%', size: 26, delay: 1.8, duration: 7, color: '#06b6d4' },
  { Icon: FaRocket,            top: '54%', left: '8%',  size: 30, delay: 0.9, duration: 8, color: '#ef4444' },
  { Icon: GiDiamonds,          top: '58%', left: '88%', size: 28, delay: 2.1, duration: 6, color: '#a855f7' },
  { Icon: FaTrophy,            top: '70%', left: '5%',  size: 28, delay: 1.5, duration: 7, color: '#eab308' },
  { Icon: FaStar,              top: '74%', left: '92%', size: 22, delay: 0.3, duration: 8, color: '#facc15' },
  { Icon: GiCardJoker,         top: '86%', left: '18%', size: 26, delay: 2.7, duration: 6, color: '#ec4899' },
  { Icon: FaCoins,             top: '88%', left: '78%', size: 24, delay: 3.3, duration: 7, color: '#f59e0b' },
];

function LoginPage() {
  const { saveAuthUser } = useContext(globalContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);

  const failedGoogleLogin = () => {
    setIsError('Something went wrong. Try again');
    setIsSubmitting(false);
  };

  const responseGoogle = (authResponse) => {
    setIsSubmitting(true);
    setIsError(false);
    api
      .post('/google-signup', { idToken: authResponse?.credential })
      .then((res) => {
        const { user, token } = res?.data?.data;
        saveAuthUser(user, token, true);
      })
      .catch((err) => {
        setIsSubmitting(false);
        setIsError(getErrors(err));
      });
  };

  return (
    <>
      <Head>
        <title>Login {__page_title_end}</title>
      </Head>

      <div className="login-page ">
        {/* Floating decorative icons + soft blobs — cosmetic only, behind
            the card. aria-hidden because the symbols carry no meaning. */}
        <div className="login-icons" aria-hidden="true">
          <span className="login-blob login-blob-a" />
          <span className="login-blob login-blob-b" />
          {FLOATING_ICONS.map((item, i) => {
            const Icon = item.Icon;
            return (
              <span
                key={i}
                className="login-icon"
                style={{
                  top: item.top,
                  left: item.left,
                  color: item.color,
                  animationDelay: `${item.delay}s`,
                  animationDuration: `${item.duration}s`,
                  fontSize: `${item.size}px`,
                }}
              >
                <Icon />
              </span>
            );
          })}
        </div>

        <header className="login-logo-bar">
          <Link href="/">
            <a aria-label="Go to home">
              <img src="/logo.png" alt="Logo" className="login-logo" />
            </a>
          </Link>
        </header>

        <main className="login-main flex items-center justify-center flex-col">
   

          <div className="login-card">
                 
            <h2 className="login-card-title">Login With Google</h2>
            <p className="login-card-sub">
              One-click sign in with your Google account
            </p>

            {isError && (
              <div className="login-error animate-fade-in">
                <Alert type="error" title={isError} />
              </div>
            )}

            <div className="login-google">
              {isSubmitting && (
                <div className="login-google-loader">
                  <CircularProgress size={20} className="text-primary-500" />
                </div>
              )}
              <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
                <GoogleLogin
                  onSuccess={responseGoogle}
                  onError={failedGoogleLogin}
                  size="large"
                  theme="outline"
                  shape="pill"
                  width="300"
                />
              </GoogleOAuthProvider>
            </div>

            <div className="login-divider" aria-hidden="true">
              <span>Security Guaranteed</span>
            </div>

            <div className="login-features">
              {FEATURES.map(({ Icon, label, tint }) => (
                <div key={label} className={`login-feature login-feature-${tint}`}>
                  <div className="login-feature-icon">
                    <Icon />
                  </div>
                  <span className="login-feature-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="login-hint">
            By continuing you agree to our{' '}
            <Link href="/terms-condition">
              <a className="login-hint-link">Terms</a>
            </Link>
            {' '}and{' '}
            <Link href="/privacy-policy">
              <a className="login-hint-link">Privacy Policy</a>
            </Link>
            .
          </p>
        </main>
      </div>
    </>
  );
}

// Tells the global Layout in _app.js to hide the site header AND footer on
// this page — the login screen has its own logo bar and no chrome.
LoginPage.disabledHeader = true;
LoginPage.disabledFooter = true;

export default LoginPage;
