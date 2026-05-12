import { Formik } from 'formik';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
import * as Yup from 'yup';
import api from '../api/api';
import Alert from '../components/Alert';
import Button from '../components/Button';
import CircularProgress from '../components/CircularProgress';
import FlashMessage from '../components/FlashMessage';
import FormikCheckBox from '../components/formik/FormikCheckBox';
import FormikInput from '../components/formik/FormikInput';
import { __page_title_end, __redirect_url_key } from '../config/globalConfig';
import routes from '../config/routes';
import { bindRedirectQuery, getErrors } from '../helpers/helpers';
import { globalContext } from './_app';

const initialValues = {
  email: '',
  password: '',
  rememberMe: ['rememberMe'],
};

const validationSchema = Yup.object().shape({
  email: Yup.string().required().email().trim().lowercase().label('Email'),
  password: Yup.string().required().label('Password'),
});

function LoginPage() {
  
  const { saveAuthUser } = useContext(globalContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);

  const router = useRouter();
  const hasRedirectUrl = router?.query?.[__redirect_url_key];

  const failedGoogleLogin = (e) => {
    setIsError('Something went wrong. Try again');
    setIsSubmitting(false);
    return;
  };

  const responseGoogle = (authResponse) => {
    api
      .post('/google-signup', {
        idToken: authResponse?.credential,
      })
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
      <div className="container">
        <div className="w-full sm:w-[380px] relative _form_wrapper">
          {isSubmitting && <div className="_absolute_full"></div>}
          <h3 className="_h3">Login</h3>
          <div className="relative !mt-7 _flex_center">
            {isSubmitting && (
              <div className="_absolute_full _flex_center bg-white/75">
                <CircularProgress size={20} className="text-primary-500" />
              </div>
            )}
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={responseGoogle}
                onError={failedGoogleLogin}
                size="large"
                theme="filled_blue"
                shape="circle"
                auto_select
              />
            </GoogleOAuthProvider>
          </div>

          <div className="mt-5">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={(values, actions) => {
                const { setSubmitting } = actions;
                setSubmitting(false);
                setIsSubmitting(true);
                setIsError(false);

                const remember = values.rememberMe.length === 1 ? 1 : 0;

                api
                  .post('/login', {
                    ...values,
                    remember,
                  })
                  .then((res) => {
                    const { user, token } = res?.data?.data;
                    saveAuthUser(user, token, remember, hasRedirectUrl);
                  })
                  .catch((err) => {
                    setIsError(getErrors(err));
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                    setSubmitting(true);
                  });
              }}
            >
              {({ handleSubmit }) => (
                <form className="flex flex-col gap-4">
                  <FlashMessage
                    type="success"
                    disabledCloseButton
                    messageKey="_changed_password_success"
                  />
                  <FlashMessage type="error" disabledCloseButton />
                  {isError && <Alert type="error" title={isError} />}
                  <FormikInput
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="Email"
                  />
                  <FormikInput
                    name="password"
                    type="password"
                    label="Password"
                    placeholder="Password"
                  />
                  <FormikCheckBox
                    name="rememberMe"
                    value="rememberMe"
                    label="Remember me"
                  />
                  <Button
                    loading={isSubmitting}
                    onClick={handleSubmit}
                    type="submit"
                    className="w-full"
                  >
                    Login
                  </Button>
                </form>
              )}
            </Formik>
            <div className="flex flex-col gap-2 mt-3.5">
              <Link href={routes.forgotPassword.name}>
                <a className="_subtitle2 _link">Forgot password?</a>
              </Link>
              <p className="_subtitle2">
                {"Don't have any account?"}
                <Link
                  href={`${routes.register.name}${bindRedirectQuery(router)}`}
                >
                  <a className="_subtitle2 _link ml-1.5">Create One</a>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
