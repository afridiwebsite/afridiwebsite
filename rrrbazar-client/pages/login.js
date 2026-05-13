import Head from 'next/head';
import Link from 'next/link';
import { useContext, useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { FaShieldAlt, FaBolt, FaLock } from 'react-icons/fa';
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
