import { Formik } from 'formik';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import * as Yup from 'yup';
import api from '../api/api';
import Alert from '../components/Alert';
import Button from '../components/Button';
import CircularProgress from '../components/CircularProgress';
import Devider from '../components/Devider';
import FormikInput from '../components/formik/FormikInput';
import { __page_title_end, __redirect_url_key } from '../config/globalConfig';
import routes from '../config/routes';
import { bindRedirectQuery, getErrors } from '../helpers/helpers';
import { globalContext } from './_app';

const initialValues = {
  username: '',
  phone: '',
  email: '',
  password: '',
  confirm_password: '',
};

const validationSchema = Yup.object().shape({
  username: Yup.string().required().trim().label('Username'),
  phone: Yup.string()
    .required()
    .matches(
      /(^(\+88|0088)?(01){1}[13456789]{1}(\d){8})$/,
      'Phone number must be a valid phone number'
    )
    .trim()
    .label('Phone'),
  email: Yup.string().required().email().trim().lowercase().label('Email'),
  password: Yup.string().required().trim().label('Password'),
  confirm_password: Yup.string()
    .required()
    .oneOf(
      [Yup.ref('password'), null],
      'Confirm password not matched with password'
    )
    .trim()
    .label('Confirm Password'),
});

function RegisterPage() {

  const { executeRecaptcha } = useGoogleReCaptcha();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);
  const { saveAuthUser } = useContext(globalContext);

  const router = useRouter();
  const hasRedirectUrl = router?.query?.[__redirect_url_key];

  const failedGoogleLogin = (e) => {
    console.log(e);
    setIsError(e?.details || 'Something went wrong. Try again');
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
        <title>Register {__page_title_end}</title>
      </Head>
      <div className="container">
        <div className="w-full sm:w-[380px] md:w-[650px] _form_wrapper relative">
          {isSubmitting && <div className="_absolute_full"></div>}
          <h3 className="_h3">Register</h3>

          {isError && <Alert className="mt-7" type="error" title={isError} />}

          {/* Google login start */}
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
              />
            </GoogleOAuthProvider>
          </div>
          {/* Google login end */}

          {/* Devider */}
          <div className="mt-8 relative">
            <span className="_subtitle2 absolute z-10 left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white py-1 px-2">
              Or
            </span>
            <Devider />
          </div>

          <div className="mt-8">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={(values, actions) => {
                const { setSubmitting, setFieldError, resetForm } = actions;
                setSubmitting(false);
                setIsError(false);
                setIsSubmitting(true);

                if (!executeRecaptcha) {
                  console.log("Execute recaptcha not yet available");
                  setIsSubmitting(false);
                  return;
                }

                executeRecaptcha("NewUserFormSubmit").then((gReCaptchaToken) => {
                  values.gRecaptchaToken = gReCaptchaToken;
                  api
                    .post('/register', {
                      ...values,
                    })
                    .then((res) => {
                      const { user, token } = res.data.data;
                      resetForm();
                      saveAuthUser(user, token, true, hasRedirectUrl);
                    })
                    .catch((err) => {
                      setSubmitting(true);
                      const serverErrors = err?.response?.data?.errors;

                      if (serverErrors?.length > 0) {
                        serverErrors.forEach((serverError) => {
                          setFieldError(serverError.param, serverError.msg);
                        });
                      } else {
                        setIsError(getErrors(err));
                      }
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                });
              }}
            >
              {({ handleSubmit }) => (
                <form className="flex flex-col gap-4">
                  <div className="_grid_2">
                    <FormikInput
                      name="username"
                      label="Username"
                      placeholder="Username"
                    />
                    <FormikInput
                      name="phone"
                      label="Phone"
                      placeholder="Phone"
                    />
                  </div>
                  <FormikInput
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="Email"
                  />
                  <div className="_grid_2">
                    <FormikInput
                      name="password"
                      type="password"
                      label="Password"
                      placeholder="Password"
                    />
                    <FormikInput
                      name="confirm_password"
                      type="password"
                      label="Confirm Password"
                      placeholder="Confirm Password"
                    />
                  </div>

                  <Button
                    type="submit"
                    loading={isSubmitting}
                    className="w-full"
                    onClick={handleSubmit}
                  >
                    Create account
                  </Button>
                </form>
              )}
            </Formik>
            <div className="flex mt-3.5 items-center justify-center flex-wrap gap-1.5 _subtitle2">
              Have an account?
              <Link href={`${routes.login.name}${bindRedirectQuery(router)}`}>
                <a className="_link">Login here</a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RegisterPage;
