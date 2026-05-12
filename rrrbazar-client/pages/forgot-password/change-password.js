import { Formik } from 'formik';
import Head from 'next/head';
import router from 'next/router';
import { useState } from 'react';
import * as Yup from 'yup';
import api from '../../api/api';
import Alert from '../../components/Alert';
import AuthGuard from '../../components/AuthGuard';
import Button from '../../components/Button';
import FormikInput from '../../components/formik/FormikInput';
import {
  __page_title_end,
  __reset_password_data_key,
} from '../../config/globalConfig';
import routes from '../../config/routes';
import { getErrors, setFlashMessage } from '../../helpers/helpers';
import { getSession, removeSession } from '../../lib/localStorage';

const initialValues = {
  password: '',
  confirm_password: '',
};

const validationSchema = Yup.object().shape({
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

function ChangePasswordPage() {
  const [isError, setIsError] = useState(null);
  const resetPasswordData = getSession(__reset_password_data_key);
  return (
    <>
      <Head>
        <title>Change password {__page_title_end}</title>
      </Head>
      <AuthGuard
        rules={resetPasswordData}
        disabledRedirect
        disabledFlashMessage
      >
        <section className="container flex-grow _flex_center">
          <div className="w-full sm:w-[380px] relative _form_wrapper">
            <h3 className="_h3 mb-1.5">Set your new password</h3>
            <div className="mt-5">
              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={(values, actions) => {
                  const { setSubmitting } = actions;

                  setIsError(null);

                  api
                    .post('/reset-password', {
                      ...values,
                      token: router.query?.reset_token,
                    })
                    .then((res) => {
                      removeSession(__reset_password_data_key);
                      setFlashMessage(
                        'Your password was changed successfully.',
                        '_changed_password_success'
                      );
                      router.push(routes.login.name);
                    })
                    .catch((err) => {
                      setSubmitting(false);
                      setIsError(getErrors(err));
                    });
                }}
              >
                {({ handleSubmit, isSubmitting }) => (
                  <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    {isError && <Alert type="error" title={isError} />}
                    <FormikInput
                      name="password"
                      label="New password"
                      placeholder="Enter new password"
                    />
                    <FormikInput
                      name="confirm_password"
                      label="Confirm password"
                      placeholder="Enter confirm password"
                    />
                    <Button
                      loading={isSubmitting}
                      type="submit"
                      text="Change Password"
                    />
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

export default ChangePasswordPage;
