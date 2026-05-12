/*
 *
 * Title: Profile.page
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { Formik } from 'formik';
import Link from 'next/link';
import { useContext, useState } from 'react';
import { IoCloseCircleSharp } from 'react-icons/io5';
import { MdModeEditOutline, MdVerified } from 'react-icons/md';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import api from '../api/api';
import routes from '../config/routes';
import toastifyConfig from '../config/toastifyConfig';
import { getErrors, hasData } from '../helpers/helpers';
import Avatar from './Avatar';
import Button from './Button';
import FormikInput from './formik/FormikInput';
import { globalContext } from '/pages/_app';

const boxClass =
  'flex items-center justify-between flex-wrap w-full md:w-[450px] bg-white rounded-md overflow-hidden px-4 md:px-5 py-3 shadow-md';
const boxTitleClass = 'text-base md:text-lg font-semibold text-gray-600';

const initialValues = {
  phone: '',
};

const validationSchema = Yup.object().shape({
  phone: Yup.string()
    .required()
    .matches(
      /(^(\+88|0088)?(01){1}[13456789]{1}(\d){8})$/,
      'Phone number must be a valid phone number'
    )
    .trim()
    .label('Phone'),
});

function SettingsPage() {
  const { authUser, updateAuthUserInfo } = useContext(globalContext);
  const { avatar, username, phone, is_phone_verify } = authUser;

  const [isOpenAddPhone, setisOpenAddPhone] = useState(false);
  const [isOpenVerifyPhone, setisOpenVerifyPhone] = useState(false);
  const [isSendingOtpForVerifyPhone, setIsSendingOtpForVerifyPhone] =
    useState(false);

  // Updating User Data On Every Time user visit profile page
  // useUpdateUserInfo();

  const sendOtpForVerifyPhone = () => {
    setIsSendingOtpForVerifyPhone(true);
    api
      .get('/verify-phone')
      .then(() => {
        setisOpenVerifyPhone(true);
        // updateAuthUserInfo({
        //   ...authUser,
        //   is_phone_verify: 0,
        // });
      })
      .catch((err) => {
        toast.error(getErrors(err), toastifyConfig);
      })
      .finally(() => {
        setIsSendingOtpForVerifyPhone(false);
      });
  };

  return (
    <>
      <section className="pb-5 md:pb-7 bg-gray-50 min-h-[80vh]">
        {/* bg */}
        <div className="bg-primary-500 h-[150px] w-full"></div>
        <div className="container mt-[-75px]">
          <div className="flex flex-col items-center">
            <Avatar
              size={130}
              src={avatar || null}
              text={username[0]}
              className="!bg-gray-50 border-4 border-white"
            />
            <h1 className="_h2 !font-bold capitalize mt-4">{username}</h1>

            <div className="mt-6 flex flex-col gap-4 w-full items-center">
              <div className={boxClass}>
                <span className={boxTitleClass}>User Id:</span>
                <span>{authUser?.id}</span>
              </div>
              <div className={boxClass}>
                <span className={boxTitleClass}>Email:</span>
                <span>{authUser?.email}</span>
              </div>
              <div className={`${boxClass} relative !overflow-visible`}>
                <span className={boxTitleClass}>Phone:</span>
                <div className="flex items-center gap-2">
                  {hasData(phone) && (
                    <Button
                      className={`extra_small ${
                        is_phone_verify ? 'green' : ''
                      }`}
                      loading={isSendingOtpForVerifyPhone}
                      onClick={() =>
                        !is_phone_verify && sendOtpForVerifyPhone()
                      }
                      StartIcon={is_phone_verify && <MdVerified size={16} />}
                    >
                      {!is_phone_verify && 'Verify phone'}
                    </Button>
                  )}
                  {hasData(phone) && <span>{phone}</span>}

                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
                    <Button
                      onClick={() => setisOpenAddPhone((prev) => !prev)}
                      className="!w-[25px] !h-[25px] extra_small !p-[0.5px]"
                      StartIcon={
                        isOpenAddPhone ? (
                          <IoCloseCircleSharp size={18} />
                        ) : (
                          <MdModeEditOutline size={16} />
                        )
                      }
                    />
                  </div>
                </div>

                {isOpenAddPhone && (
                  <div className="w-full mt-6">
                    <Formik
                      initialValues={initialValues}
                      validationSchema={validationSchema}
                      onSubmit={(values, action) => {
                        api
                          .post('/change-phone', {
                            phone: values.phone,
                          })
                          .then((res) => {
                            updateAuthUserInfo({
                              ...authUser,
                              phone: values.phone,
                              ...(phone !== values.phone && {
                                is_phone_verify: 0,
                              }),
                            });
                            toast.success(
                              'Phone number updated succussfully',
                              toastifyConfig
                            );
                            setisOpenAddPhone(false);
                          })
                          .catch((err) => {
                            action.setFieldError('phone', getErrors(err));
                          })
                          .finally(() => {
                            action.setSubmitting(false);
                          });
                      }}
                    >
                      {({ handleSubmit, isSubmitting }) => (
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <FormikInput name="phone" placeholder="Your phone" />
                          <Button
                            type="submit"
                            loading={isSubmitting}
                            className="w-full block"
                          >
                            {hasData(phone) ? 'Change Phone' : 'Add Phone'}
                          </Button>
                        </form>
                      )}
                    </Formik>
                  </div>
                )}

                {isOpenVerifyPhone && (
                  <div className="mt-6 w-full">
                    <h4 className="_h4">Verify your phone</h4>
                    <p className="_subtitle1 md:text-sm mt-1">
                      We sent a 6 digit code to {phone}
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
                        onSubmit={(values, action) => {
                          api
                            .post('/verify-otp', {
                              otp: values.otp,
                            })
                            .then((res) => {
                              toast.success(
                                'Your phone number is now verified',
                                toastifyConfig
                              );
                              updateAuthUserInfo({
                                ...authUser,
                                is_phone_verify: 1,
                              });
                              setisOpenVerifyPhone(false);
                            })
                            .catch((err) => {
                              action.setFieldError('otp', getErrors(err));
                            })
                            .finally(() => {
                              action.setSubmitting(false);
                            });
                        }}
                      >
                        {({ handleSubmit, isSubmitting }) => (
                          <form className="space-y-4" onSubmit={handleSubmit}>
                            <FormikInput name="otp" placeholder="Your OTP" />
                            <Button
                              type="submit"
                              loading={isSubmitting}
                              className="w-full block"
                            >
                              Verify Phone
                            </Button>
                          </form>
                        )}
                      </Formik>
                    </div>
                  </div>
                )}
              </div>
              <div className={`${boxClass} !flex-col !items-start`}>
                <span className={boxTitleClass}>Change Password</span>
                <div className="mt-5 w-full">
                  <Formik
                    initialValues={{
                      old_password: '',
                      new_password: '',
                      confirm_password: '',
                    }}
                    validationSchema={Yup.object().shape({
                      old_password: Yup.string()
                        .required()
                        .trim()
                        .label('Old password'),
                      new_password: Yup.string()
                        .required()
                        .trim()
                        .label('New password'),
                      confirm_password: Yup.string()
                        .required()
                        .oneOf(
                          [Yup.ref('new_password'), null],
                          'Confirm password not matched with password'
                        )
                        .trim()
                        .label('Confirm password'),
                    })}
                    onSubmit={(values, action) => {
                      api
                        .post('/change-password', {
                          old_password: values.old_password,
                          new_password: values.new_password,
                          confirm_password: values.confirm_password,
                        })
                        .then((res) => {
                          toast.success(
                            'Your password is now changed succuessfully',
                            toastifyConfig
                          );
                          action.resetForm();
                        })
                        .catch((err) => {
                          action.setFieldError(
                            'confirm_password',
                            getErrors(err)
                          );
                        })
                        .finally(() => {
                          action.setSubmitting(false);
                        });
                    }}
                  >
                    {({ handleSubmit, isSubmitting }) => (
                      <form className="space-y-4" onSubmit={handleSubmit}>
                        <FormikInput
                          name="old_password"
                          placeholder="Old password"
                        />
                        <FormikInput
                          name="new_password"
                          placeholder="New password"
                        />
                        <FormikInput
                          name="confirm_password"
                          placeholder="Confirm password"
                        />
                        <Button
                          type="submit"
                          loading={isSubmitting}
                          className="w-full block"
                        >
                          Change Password
                        </Button>
                      </form>
                    )}
                  </Formik>
                  <div className="flex justify-end mt-4">
                    <Link href={routes.forgotPassword.name}>
                      <a className="_subtitle2 _link">Forgot password?</a>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default SettingsPage;
