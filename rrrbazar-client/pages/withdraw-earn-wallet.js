import { Formik } from 'formik';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { BsCheckCircleFill } from 'react-icons/bs';
import { GoPrimitiveDot } from 'react-icons/go';
import { useQuery } from 'react-query';
import * as Yup from 'yup';
import api, { getPaymentMethod } from '../api/api';
import ActivityIndicator from '../components/ActivityIndicator';
import Alert from '../components/Alert';
import AuthGuard from '../components/AuthGuard';
import Button from '../components/Button';
import FormikErrorMessage from '../components/formik/FormikErrorMessage';
import FormikInput from '../components/formik/FormikInput';
import SelectedRadio from '../components/SelectedRadio';
import ShowErrorAfterSubmit from '../components/ShowErrorAfterSubmit';
import { __page_title_end, __redirect_url_key } from '../config/globalConfig';
import reactQueryConfig from '../config/reactQueryConfig';
import routes from '../config/routes';
import {
  getErrors,
  hasData,
  imgPath,
  scrollTopWindow,
  setFlashMessage,
} from '../helpers/helpers';

const initialValues = {
  amount: '',
  number: '',
  payment_method: '',
};

const validationSchema = Yup.object().shape({
  amount: Yup.string()
    .required()
    .matches(/^([1-9])/, "Amount can't be start with 0")
    .matches(/^\d+$/, 'Amount must be a number')
    .trim()
    .label('Withdraw Amount'),
  number: Yup.string()
    .required()
    .matches(
      /(^(\+88|0088)?(01){1}[13456789]{1}(\d){8,9})$/,
      'Number must be a valid phone number'
    )
    .trim()
    .label('Number'),
  payment_method: Yup.string()
    .required('Please select a payment method')
    .trim(),
});

const step1Rules = [
  'নিচে যে দুটি বক্স দেখতে পারছেন প্রথম Box এ কত টাকা Withdraw করবেন সেটা লিখুন।',
  'দ্বিতীয় বক্সে আপনি আপনার অর্থাৎ যে নাম্বারে টাকা নিতে চান সেটা লিখুন',
  'তারপর  Withdraw monny অপশনে ক্লিক করুণ।',
];
const step2Rules = [
  'দশ থেকে বিশ মিনিটের মধ্যে টাকা যোগ হয়ে যাবে আপনার ওয়ালেটে।',
  'অবশ্যই এই টাকা গুলা টুর্নামেন্ট খেলে ইনকাম করতে হবে।',
];
function WithdrawEarnWallet() {
  const {
    data: payment_methods,
    isLoading,
    isError,
  } = useQuery('payment-methods', getPaymentMethod, reactQueryConfig);

  const router = useRouter();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnrecognizedError, setIsUnrecognizedError] = useState(false);

  return (
    <>
      <Head>
        <title>Withdraw Earn Wallet {__page_title_end}</title>
      </Head>
      <AuthGuard>
        <section className="container">
          <div className="w-full sm:w-[600px] mx-auto my-7">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={(values, actions) => {
                const { setSubmitting, resetForm, setFieldError } = actions;

                setSubmitting(false);
                setIsSubmitting(true);

                api
                  .post('/withdraw-earn-wallet', {
                    ...values,
                    purpose: 'withdraw-earn-wallet',
                  })
                  .then(() => {
                    resetForm();
                    setFlashMessage('Your withdraw request is successful.');
                    router.push(
                      router?.query[__redirect_url_key] ||
                        routes.myTransaction.name
                    );
                  })
                  .catch((err) => {
                    setSubmitting(true);

                    const serverErrors = err?.response?.data?.errors;

                    if (serverErrors?.length > 0) {
                      serverErrors.forEach((serverError) => {
                        setFieldError(serverError.param, serverError.msg);
                      });
                    } else {
                      // window.scrollTop = 0;
                      setIsUnrecognizedError(getErrors(err));
                      scrollTopWindow();
                    }
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
            >
              {({
                handleSubmit,
                touched,
                errors,
                initialValues,
                setFieldValue,
              }) => {
                const isPaymentMethodError =
                  errors['payment_method'] && touched['payment_method'];

                return (
                  <>
                    {isUnrecognizedError && (
                      <Alert
                        type="error"
                        className="mb-4"
                        title={isUnrecognizedError}
                      />
                    )}
                    {/* Select Payment Method --Start-- */}
                    <div className="_order_box_wrapper">
                      <div className="_order_box_header">
                        <div className="_order_header_step_circle">1</div>
                        <h5 className="_order_header_title">
                          Select your payment method
                        </h5>
                      </div>

                      <div className="order_box_body">
                        <ActivityIndicator
                          data={payment_methods}
                          error={isError}
                          loading={isLoading}
                        />

                        {hasData(payment_methods) && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
                              {payment_methods.map((payment_method, index) => (
                                <SelectedRadio
                                  key={index}
                                  bottomComponent={payment_method?.name}
                                  topComponent={
                                    <img
                                      src={imgPath(payment_method?.logo)}
                                      className="w-[70%] mx-auto"
                                      alt={payment_method?.name}
                                    />
                                  }
                                  isSelected={
                                    selectedPaymentMethod?.name ===
                                    payment_method?.name
                                  }
                                  isError={isPaymentMethodError}
                                  onClick={() => {
                                    setSelectedPaymentMethod(payment_method);
                                    setFieldValue(
                                      'payment_method',
                                      payment_method?.name
                                    );
                                  }}
                                />
                              ))}
                            </div>
                            <FormikErrorMessage name="payment_method" />
                          </>
                        )}
                      </div>
                    </div>
                    {/* Select Payment Method --End-- */}

                    {/* How to add money --Start-- */}
                    <div className="_order_box_wrapper">
                      <div className="_order_box_header">
                        <div className="_order_header_step_circle">2</div>
                        <h5 className="_order_header_title">
                          How To Withdraw Money
                        </h5>
                      </div>

                      <div className="order_box_body">
                        {/* Showing Selected Payment Method Name and Info --End-- */}
                        <div>
                          <p className="_subtitle1 text-gray-800 font-semibold">
                            Step 1:
                          </p>
                          <div className="pl-2 mt-2 space-y-2.5">
                            {step1Rules.map((rule, index) => (
                              <p
                                className="_body2 flex items-start gap-2"
                                key={index}
                              >
                                <GoPrimitiveDot className="text-gray-500" />{' '}
                                {rule}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="_subtitle1 text-gray-800 font-semibold">
                            Step 2:
                          </p>
                          <div className="pl-2 mt-2 space-y-2.5">
                            {step2Rules.map((rule, index) => (
                              <p
                                className="_body2 flex items-start gap-2"
                                key={index}
                              >
                                <GoPrimitiveDot className="text-gray-500" />{' '}
                                {rule}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* How to add money --End-- */}

                    {/* Add money form --Start-- */}
                    <div className="_order_box_wrapper">
                      <div className="_order_box_header">
                        <div className="_order_header_step_circle">3</div>
                        <h5 className="_order_header_title">
                          Request Withdraw Money
                        </h5>
                      </div>

                      <div className="order_box_body">
                        <form className="flex flex-col gap-4">
                          <div className="_grid_2">
                            <FormikInput
                              name="amount"
                              label="Amount"
                              placeholder="Amount"
                            />
                            <FormikInput
                              name="number"
                              label="Your Number"
                              placeholder="Your Number"
                            />
                          </div>

                          <ShowErrorAfterSubmit
                            className="mb-0"
                            touched={touched}
                            errors={errors}
                            initialValues={initialValues}
                          />
                          <Button
                            type="submit"
                            onClick={handleSubmit}
                            className="w-full"
                            loading={isSubmitting}
                          >
                            Withdraw Money
                          </Button>
                        </form>
                      </div>
                    </div>
                    {/* Add money form --End-- */}
                  </>
                );
              }}
            </Formik>
          </div>
        </section>
      </AuthGuard>
    </>
  );
}

export default WithdrawEarnWallet;
