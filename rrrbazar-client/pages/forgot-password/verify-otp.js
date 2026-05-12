import { Formik } from 'formik';
import Head from 'next/head';
import router from 'next/router';
import { useState } from 'react';
import { useQuery } from 'react-query';
import * as Yup from 'yup';
import api, { reSendOtp } from '../../api/api';
import Alert from '../../components/Alert';
import AuthGuard from '../../components/AuthGuard';
import Button from '../../components/Button';
import CircularProgress from '../../components/CircularProgress';
import FormikInput from '../../components/formik/FormikInput';
import {
  __page_title_end,
  __reset_password_data_key,
} from '../../config/globalConfig';
import reactQueryConfig from '../../config/reactQueryConfig';
import routes from '../../config/routes';
import { getErrors } from '../../helpers/helpers';
import { getSession } from '../../lib/localStorage';

function VerifyOtpPage() {
  const resetPasswordData = getSession(__reset_password_data_key);
  const RESEND_AGAIN_TIME = 60; // Time in second

  const [isResendOtp, setIsResendOtp] = useState(null);
  const [resendAgainCounter, setResendAgainCounter] =
    useState(RESEND_AGAIN_TIME);
  let resendAgainInterval;

  const resetCounter = () => {
    setIsResendOtp(null);
    setResendAgainCounter(RESEND_AGAIN_TIME);
    clearInterval(resendAgainInterval);
  };

  const { data, isLoading, isFetching, isError, error } = useQuery(
    'send-otp',
    reSendOtp,
    {
      ...reactQueryConfig,
      enabled: !!isResendOtp,
      cacheTime: 0,
      onSuccess: () => {
        resendAgainInterval = setInterval(() => {
          setResendAgainCounter((prev) => prev - 1);
        }, 1000);

        setTimeout(() => {
          resetCounter();
        }, RESEND_AGAIN_TIME * 1000);
      },
      onError: resetCounter,
    }
  );

  return (
    <>
      <Head>
        <title>Verify Otp {__page_title_end}</title>
      </Head>
      <AuthGuard
        rules={resetPasswordData}
        disabledRedirect
        disabledFlashMessage
      >
        <section className="container flex-grow _flex_center">
          <div className="w-full sm:w-[380px] relative _form_wrapper">
            <h3 className="_h3 mb-1.5">Verify OTP</h3>
            <p className="_subtitle2 text-gray-500">
              Wen sent a 5 digit OTP code to{' '}
              <span className="text-gray-900 font-bold">
                {resetPasswordData?.starsPhone}
              </span>
            </p>
            <div className="mt-5">
              <Formik
                initialValues={{
                  otp: '',
                }}
                validationSchema={Yup.object().shape({
                  otp: Yup.string()
                    .required()
                    .matches(/^\d+$/, 'Otp must be a number')
                    .length(5)
                    .trim()
                    .label('Otp'),
                })}
                onSubmit={({ otp }, actions) => {
                  const { setFieldError, setSubmitting } = actions;
                  api
                    .post(
                      `/reset-password-otp/${resetPasswordData?.user?.id}`,
                      {
                        otp,
                      }
                    )
                    .then((res) => {
                      router.push(
                        `${routes.changePassword.name}?reset_token=${res.data.data.reset_token}`
                      );
                    })
                    .catch((err) => {
                      setFieldError('otp', getErrors(err));
                      setSubmitting(false);
                    });
                }}
              >
                {({ handleSubmit, isSubmitting }) => (
                  <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    {data && !isFetching && (
                      <Alert
                        type="success"
                        title="Otp code resend successfully"
                      />
                    )}
                    <FormikInput
                      name="otp"
                      label="Otp code"
                      placeholder="Enter otp code"
                    />
                    <Button
                      loading={isSubmitting}
                      text="Verify Otp"
                      className="w-full"
                    />

                    <div className="-mt-1">
                      {resendAgainCounter && isResendOtp && !isFetching ? (
                        <span className="_subtitle2 text-gray-500">
                          Resend again is {resendAgainCounter}s
                        </span>
                      ) : (
                        <div
                          className={`flex items-center ${
                            isLoading || isFetching
                              ? 'opacity-60 pointer-events-none'
                              : ''
                          }`}
                          onClick={() => setIsResendOtp(true)}
                        >
                          <span
                            className={`_subtitle2 _link cursor-pointer select-none !inline-block px-3 py-1 pl-0`}
                          >
                            Resend OTP
                          </span>
                          {(isLoading || isFetching) && (
                            <CircularProgress className="text-primary-500 w-3 h-3" />
                          )}
                        </div>
                      )}
                      {isError && (
                        <span className="_body2 text-red-500 mt-1.5">
                          {getErrors(error)}
                        </span>
                      )}
                    </div>
                  </form>
                )}
              </Formik>
            </div>
          </div>
        </section>
      </AuthGuard>
    </>
  );
}

export default VerifyOtpPage;
