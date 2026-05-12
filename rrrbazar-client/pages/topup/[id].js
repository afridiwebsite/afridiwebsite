import { Formik } from 'formik';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { useQuery } from 'react-query';
//import ShowMoreText from 'react-show-more-text';
import Swal from 'sweetalert2';
import * as Yup from 'yup';
import api, { getTopupPackage, getUserProfile, getProductOrders, getPlayerName } from '../../api/api';
import ActivityIndicator from '../../components/ActivityIndicator';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import FormikErrorMessage from '../../components/formik/FormikErrorMessage';
import FormikInput from '../../components/formik/FormikInput';
import SelectedRadio from '../../components/SelectedRadio';
import ShowErrorAfterSubmit from '../../components/ShowErrorAfterSubmit';
import {
  __site_name_1,
  __site_name_2
} from '../../config/globalConfig';
import reactQueryConfig from '../../config/reactQueryConfig';
import routes from '../../config/routes';
import {
  addRedirectQuery,
  getErrors,
  hasData,
  imgPath,
  scrollTopWindow,
  setFlashMessage,
} from '../../helpers/helpers';
import { globalContext } from '../_app';

function TopupOrderPage() {
  const [playerData, setPlayerData] = useState(null);
  const [selectedAccountType, setSelectedAccountType] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  // const [isSubmitting, setisSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const { isAuth, updateAuthUserInfo, authUser } = useContext(globalContext);
  const router = useRouter();
  const product_id = router.query.id;

  // Refetching User Data On Every Time user visit this page
  const { data: userProfileData } = useQuery('user-profile', getUserProfile, {
    ...reactQueryConfig,
    enabled: !!isAuth,
  });
  useEffect(() => {
    setSelectedPaymentMethod('pay');
    if (userProfileData) {
      updateAuthUserInfo(userProfileData);
    }
  }, [userProfileData, updateAuthUserInfo]);

  const userWallet = authUser?.wallet;

  const {
    data: productData,
    isLoading,
    error,
    isError,
  } = useQuery('get-topup-product', () => getTopupPackage(product_id), {
    ...reactQueryConfig,
    enabled: !!product_id,
  });

  const {
    data: productOrder,
    isLoading1,
    error1,
    isError1,
  } = useQuery('get-product-order', () => getProductOrders(product_id), {
    ...reactQueryConfig,
    enabled: !!product_id,
  });

  const {
    data: playerInfo,
    isLoading: isLoading2,
    error: error2,
    isError: isError2
  } = useQuery(
    ['get-player-info', playerData],
    () => getPlayerName(playerData),
    {
      enabled: !!playerData,
    }
  );

  const productInfo = productData?.product;
  const packages = productData?.packages;

  const isGmailSelected = selectedAccountType === 'gmail' ? true : false;
  const isActiveForTopup = productInfo?.isactivefortopup === 1 ? true : false;
  const displayUnipinVoucher = productInfo?.id === 15 ? "none" : "block";
  const isUnipinVoucher = productInfo?.id === 15 ? true : false;

  // Form Initial values
  const initialValues = {
    playerid: isUnipinVoucher ? 'UNIPIN_VOUCHER' : '',
    selectedpackage: null,
    payment_mathod: '',
    ...((!isActiveForTopup && productInfo?.is_offer == 0) && {
      accounttype: 'gmail',
      ingamepassword: '',
      securitycode: productInfo?.id == 11 ? "Clash Of Clan" : '',
    }),
  };

  // Form Validation Schema
  const validationSchema = Yup.object().shape({
    playerid: Yup.string()
      .required(
        isActiveForTopup
          ? 'আপনার আইডি কোড ভুল'
          : 'Facebook or Gmail is required'
      )
      .trim(),
    selectedpackage: Yup.object().nullable().required('Select a package'),
    payment_mathod: Yup.string().required().trim().label('Payment method'),
    ...((!isActiveForTopup && productInfo?.is_offer == 0) && {
      accounttype: Yup.string().required().label('Account type').trim(),
      ingamepassword: Yup.string().required().trim().label('Password'),
      ...(selectedAccountType === 'gmail' && {
        securitycode: Yup.string()
          .required()
          .trim()
          .label('Account backup code'),
      }),
    }),
  });

  const handlePlayerIdChange = (e, handleChange) => {
    handleChange(e);
    const newPlayerID = e.target.value;
    setPlayerData(newPlayerID);
  };

  return (
    <>
      <Head>
        <title>{productInfo?.name}</title>
      </Head>
      <section
        className={`my-7 ${
          !hasData(productData)
            ? 'flex-grow items-center flex justify-center flex-col'
            : ''
        }`}
      >
        <div className="container">
          <ActivityIndicator
            data={productData}
            loading={isLoading}
            errorMsg="Topup product not found"
            error={isError ? error : undefined}
          />
          {hasData(productData) && (
            <div className="grid grid-cols-1 lg:grid-cols-[400px,auto] gap-7">
              {/* Topup Product Info And Rules --Start-- */}
              <div>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  {/* Top up Image */}
                  <img
                    src={imgPath(productInfo?.logo)}
                    className="w-full h-[120px] object-cover bg-gray-100"
                    alt=""
                  />
                  <div className="py-3 px-4 mt-[-25px]">
                    {/* Product name */}
                    <h5 className="_h5 bg-white inline-block rounded-full border border-gray-200 px-4 py-0.5">
                      {productInfo?.name}
                    </h5>
                    {/* Product Description */}
                    {productInfo?.rules && productInfo?.rules !== '<p></p>' && (
                      <>
                        <p className="_subtitle2 mt-2.5 mb-2">Description: </p>
                        <div className="_body2 text-[13px]">
                          {ReactHtmlParser(productInfo?.rules)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* Topup Product Info And Rules --End-- */}

              <div className="relative">
                {!isAuth && (
                  <Alert
                    className="mb-4"
                    title="You must logged in to order. Please login first"
                    action={
                      <Link href={routes.login.name + addRedirectQuery(router)}>
                        <a>
                          <Button className="small">Login</Button>
                        </a>
                      </Link>
                    }
                  />
                )}

                {isAuth && !userWallet && selectedPaymentMethod != 'auto_payment' && (
                  <Alert
                    className="mb-4"
                    title={
                      'You do not have enough money to order, Please first add some money'
                    }
                    action={
                      <Link
                        href={routes.addMoney.name + addRedirectQuery(router)}
                      >
                        <a>
                          <Button className="small">Add Money</Button>
                        </a>
                      </Link>
                    }
                  />
                )}
                {/* Server Error */}
                {serverError && (
                  <Alert className="mb-4" type="error" title={serverError} />
                )}
                {/* Topup Order Form --Start-- */}
                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={(values, actions) => {
                    const { setSubmitting } = actions;
                    let isConfirmed = false;

                    setSubmitting(false);

                    setServerError(null);
                    const {
                      accounttype,
                      playerid,
                      ingamepassword,
                      securitycode,
                      selectedpackage,
                      payment_mathod
                    } = values;

                    Swal.fire({
                      title: false,
                      html: `
                            <div class="_confirm_order_body">
                              <h4 class="_h4">Confirm Order</h4>
                              <p className="modal_sub_title">Your current wallet is <span class="_bold_it">৳${userWallet}</span></p>
                              <p className="modal_sub_title">You need <span class="_bold_it">৳${selectedpackage.price}</span> to purchase this product.</p>
                            </div>`,
                      customClass: {
                        popup: '_confirm_order_modal_popup',
                        cancelButton: '_cancel_btn',
                        confirmButton: '_confirm_btn',
                      },
                      cancelButtonText: 'Cancel',
                      confirmButtonText: 'Confirm order',
                      showCancelButton: true,
                      cancelButtonColor: 'red',
                    }).then((e) => {
                      if (e.isConfirmed && !isConfirmed) {
                        isConfirmed = true;
                        setSubmitting(true);
                        api
                          .post('/packageorder', {
                            topuppackage_id: selectedpackage.id,
                            product_id: selectedpackage.product_id,
                            name: selectedpackage.name,
                            accounttype,
                            playerid,
                            ingamepassword: isActiveForTopup
                              ? 'IDCODE'
                              : ingamepassword,
                            securitycode: isActiveForTopup
                              ? 'IDCODE'
                              : securitycode,
                            // payment_mathod: 1,
                            payment_mathod,
                          })
                          .then((order_res) => {
                            if (order_res.data?.data?.message == 'Payment Url') {
                              setFlashMessage(
                                'Redirect Payment Gateway'
                              );
                              window.location.assign(order_res.data?.data?.payment_url)
                            } else {
                              setFlashMessage(
                                'Your order has been placed successfully.'
                              );
                              router.push(routes.myOrder.name);
                            }
                          })
                          .catch((err) => {
                            setSubmitting(false);
                            const error = getErrors(err);
                            setServerError(error);
                            scrollTopWindow();
                          });
                      } else {
                        isConfirmed = false;
                      }
                    });
                  }}
                >
                  {({
                    setFieldValue,
                    setFieldTouched,
                    handleChange,
                    errors,
                    touched,
                    values,
                    initialValues,
                    isSubmitting,
                    handleSubmit,
                  }) => {
                    const isAccountTypeError =
                      errors['accounttype'] && touched['accounttype'];

                    const isPackageIdError =
                      errors['selectedpackage'] && touched['selectedpackage'];

                    const isPaymentError = errors['payment_mathod'];
                    //const isPaymentError = errors['payment_mathod'] && touched['payment_mathod'];

                    const isNotEnoughMoney =
                      values.selectedpackage?.price > authUser?.wallet;

                    // useEffect(() => {
                    //   isPackageIdError && setFieldTouched('selectedpackage');
                    //   isPaymentError && setFieldTouched('payment_mathod');
                    // }, [isPackageIdError, isPaymentError]);

                    return (
                      <div>
                        {isSubmitting && (
                          <div className="_absolute_full z-50"></div>
                        )}
                        {/* Account Info Form --Start-- */}
                        <div className="_order_box_wrapper" style={{
                                      display: displayUnipinVoucher
                                    }}>
                          <div className="_order_box_header">
                            <div className="_order_header_step_circle">1</div>
                            <h5 className="_order_header_title">
                              Account Info
                            </h5>
                          </div>

                          <div className="order_box_body">
                            {isActiveForTopup ? (
                                <>
                                  {isUnipinVoucher && (
                                    <div className="_grid_2">
                                      <FormikInput
                                        label={productInfo.id == 28 ? "Username" : "Player ID"}
                                        type={productInfo.id == 28 ? "text" : "number"}
                                        placeholder={productInfo.id == 28 ? "Telegram Username" : "Enter Player ID"}
                                        className="small"
                                        name="playerid"
                                        onChange={(e) => handlePlayerIdChange(e, handleChange)}
                                      />
                                    </div>
                                  )}

                                  {!isUnipinVoucher && (
                                    <div className="_grid_2">
                                      <FormikInput
                                        label={productInfo.id == 28 ? "Username" : "Player ID"}
                                        placeholder={productInfo.id == 28 ? "Telegram Username" : "Enter Player ID"}
                                        type={productInfo.id == 28 ? "text" : "number"}
                                        className="small"
                                        name="playerid"
                                        onBlur={(e) => handlePlayerIdChange(e, handleChange)}
                                      />
                                    </div>
                                  )}

                                  {isLoading2 && <p style={{ marginTop: '-12px', fontSize: '12px', fontStyle: 'italic', color: 'green' }}>Searching for player name...</p>}
                                  {isError2 && <p>Error: {error2.message}</p>}
                                  {playerInfo?.data && (
                                    <div style={{ marginTop: '-12px', fontSize: '12px', fontStyle: 'italic' }}>
                                      <span style={{ marginRight: '14px'}}>Player Name: <strong>{playerInfo?.data?.nickname}</strong></span>
                                      <span>Region: <strong>{playerInfo?.data?.region}</strong></span>
                                    </div>
                                  )}

                                </>
                            ) : (
                              // Visible If Product is Inactive For Topup --Start--
                              <>
                                <div className="_grid_2">
                                  <div>
                                    <label
                                      htmlFor="accounttype"
                                      className={`_subtitle2 mb-1.5 block ${
                                        isAccountTypeError ? 'text-red-500' : ''
                                      }`}
                                    >
                                      Account Type
                                    </label>
                                    <select
                                      className={`_input small !py-[7px] ${
                                        isAccountTypeError
                                          ? '!border-red-500'
                                          : ''
                                      }`}
                                      name="accounttype"
                                      onChange={(e) => {
                                        setSelectedAccountType(e.target.value);
                                        return handleChange('accounttype')(e);
                                      }}
                                      onBlur={() =>
                                        setFieldTouched('accounttype')
                                      }
                                    >
                                      <option value="">Select an option</option>
                                      {productInfo?.is_offer == 0 && productInfo?.id != 11 && 
                                        <option value="facebook">Facebook</option>
                                      }
                                      <option value="gmail">Gmail</option>
                                    </select>
                                    <FormikErrorMessage name="accounttype" />
                                  </div>

                                  <FormikInput
                                    label={
                                      isGmailSelected
                                        ? 'Your email'
                                        : 'Facebook number'
                                    }
                                    placeholder={
                                      isGmailSelected
                                        ? 'Enter email'
                                        : 'Enter number'
                                    }
                                    className="small"
                                    name="playerid"
                                  />
                                </div>
                                {productInfo?.is_offer == 0 &&
                                  <div className="_grid_2">
                                    <FormikInput
                                      label={productInfo?.id == 11 ? "WhatsApp Number" : "Password"}
                                      placeholder={productInfo?.id == 11 ? "Enter Your WhatsApp Number" : "Enter password"}
                                      className="small"
                                      name="ingamepassword"
                                    />
                                    <div style={{display: (productInfo?.id == 11) ? 'none' : 'block'}}>
                                      <FormikInput
                                        label={`${
                                          isGmailSelected ? 'Gmail' : 'Facebook'
                                        } backup code`}
                                        placeholder="Enter backup code"
                                        className="small"
                                        name="securitycode"
                                      />
                                      <p className="flex justify-end _body2 mt-1.5">
                                        <a
                                          target="_blank"
                                          rel="noreferrer"
                                          href={
                                            isGmailSelected
                                              ? 'https://www.youtube.com/watch?v=Bep21CCIV-M'
                                              : 'https://www.youtube.com/watch?v=jSt--79opM8'
                                          }
                                          className="_link flex gap-2"
                                        >
                                          <HiOutlineExternalLink
                                            size={18}
                                            className="flex-shrink-0"
                                          />
                                          {isGmailSelected
                                            ? ' কিভাবে জিমেইল অ্যাকাউন্ট এর ব্যাকআপ কোড বের করবেন? '
                                            : ' কিভাবে ফেসবুক অ্যাকাউন্ট এর ব্যাকআপ কোড বের করবেন? '}
                                        </a>
                                      </p>
                                    </div>
                                  </div>
                                }
                              </>
                              // Visible If Product is Inactive For Topup --End--
                            )}
                          </div>
                        </div>
                        {/* Account Info Form --End-- */}

                        {/* Select Recharge --Start-- */}
                        <div className="_order_box_wrapper">
                          <div className="_order_box_header">
                            <div className="_order_header_step_circle">2</div>
                            <h5 className="_order_header_title">
                              Select Recharge
                            </h5>
                          </div>

                          <div className="order_box_body">
                            {productInfo?.is_offer == 1 && 
                              <p style={{
                                textAlign: 'center',
                                fontSize: '1.3rem',
                                fontWeight: 'bold',
                                color: 'green',
                                border: '1px solid',
                                borderRadius: '3px',
                                padding: '5px'
                              }}>
                                Available Stock: {productInfo?.offer_items}
                              </p>
                            }

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                              {/* Single Recharge --Start-- */}
                              {packages.map((pack, index) => {
                                return (
                                  <SelectedRadio
                                    key={index}
                                    outOfStock={parseInt(pack?.in_stock) === 0}
                                    onClick={() => {
                                      setSelectedPackage(index);
                                      setFieldValue('selectedpackage', pack);

                                      setSelectedPaymentMethod('pay');
                                      setFieldValue('payment_mathod', 'pay');
                                    }}
                                    isError={isPackageIdError}
                                    isSelected={
                                      parseInt(selectedPackage) === index
                                    }
                                    topComponent={
                                      <span className="px-1 py-2 inline-block">
                                        {pack?.name}
                                      </span>
                                    }
                                    bottomComponent={`৳ ${pack?.price}`}
                                  />
                                );
                              })}
                              {/* Single Recharge --End-- */}
                            </div>
                            <FormikErrorMessage name="selectedpackage" />
                            <FormikErrorMessage
                              showError={isNotEnoughMoney && selectedPaymentMethod != 'auto_payment'}
                              msg={
                                <p>
                                  You do not have enough money to order this
                                  package, Please{' '}
                                  {
                                    <Link
                                      href={
                                        routes.addMoney.name +
                                        addRedirectQuery(router)
                                      }
                                    >
                                      <a className="_link">Add Money</a>
                                    </Link>
                                  }{' '}
                                  or choose another package.
                                </p>
                              }
                            />
                          </div>
                        </div>
                        {/* Select Recharge --End-- */}

                        {/* Select Payment Option --Start-- */}
                        <div className="_order_box_wrapper">
                          <div className="_order_box_header">
                            <div className="_order_header_step_circle">3</div>
                            <h5 className="_order_header_title">
                              Select Payment
                            </h5>
                          </div>

                          <div className="order_box_body">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
                              <SelectedRadio
                                bottomComponent={__site_name_1 + " Wallet"}
                                topComponent={
                                  <div className="p-1.5 bg-white pb-2.5">
                                    <img
                                      className="w-full h-auto"
                                      src="/logo.png"
                                    />
                                  </div>
                                }
                                isSelected={selectedPaymentMethod === 'pay'}
                                isError={isPaymentError}
                                onClick={() => {
                                  setSelectedPaymentMethod('pay');
                                  setFieldValue('payment_mathod', 'pay');
                                }}
                              />
                              <SelectedRadio
                                bottomComponent="Auto Payment"
                                topComponent={
                                  <div className="p-1.5 bg-white pb-2.5">
                                    <img
                                      className="w-full h-auto"
                                      src="/auto_payment.jpeg"
                                    />
                                  </div>
                                }
                                isSelected={selectedPaymentMethod === 'auto_payment'}
                                isError={isPaymentError}
                                onClick={() => {
                                  setSelectedPaymentMethod('auto_payment');
                                  setFieldValue('payment_mathod', 'auto_payment');
                                }}
                              />
                            </div>
                            <FormikErrorMessage name="payment_mathod" />
                            {isUnipinVoucher && (
                              <a
                                target="_blank"
                                rel="noreferrer"
                                href="https://www.youtube.com/channel/UCBxW_RwMy5a5r5DVtYSMUGg"
                                className="_link flex gap-2"
                              >
                                <HiOutlineExternalLink
                                  size={18}
                                  className="flex-shrink-0"
                                />
                                কিভাবে Voucher রিডিম করে ডাইমন্ড নিবেন?
                              </a>
                            )}
                          </div>
                        </div>
                        {/* Select Payment Option --End-- */}

                        {/* Show Error After Submit Form --Start-- */}
                        <ShowErrorAfterSubmit
                          errors={errors}
                          initialValues={initialValues}
                          touched={touched}
                        />
                        {/* Show Error After Submit Form --End-- */}

                        <div className="flex justify-end gap-3">
                          {!isAuth && (
                            <Link
                              href={
                                routes.login.name + addRedirectQuery(router)
                              }
                            >
                              <a>
                                <Button type="button" className="outlined">
                                  Login
                                </Button>
                              </a>
                            </Link>
                          )}
                          {((isAuth && !userWallet && selectedPaymentMethod != 'auto_payment') || (isNotEnoughMoney && selectedPaymentMethod != 'auto_payment')) && (
                            <Link
                              href={
                                routes.addMoney.name + addRedirectQuery(router)
                              }
                            >
                              <a>
                                <Button type="button" className="outlined">
                                  Add Money
                                </Button>
                              </a>
                            </Link>
                          )}
                          <Button
                            disabled={
                              !isAuth || (!userWallet && selectedPaymentMethod != 'auto_payment') || (isNotEnoughMoney && selectedPaymentMethod != 'auto_payment')
                            }
                            onClick={handleSubmit}
                            type="submit"
                            loading={isSubmitting}
                          >
                            Buy Now
                          </Button>
                        </div>

                        <br /><br /><br />

                        {/* Last Order Form --Start-- */}
                        <div className="_order_box_wrapper">
                          <div className="_order_box_header">
                            <div className="_order_header_step_circle"></div>
                            <h5 className="_order_header_title">
                              Description
                            </h5>
                          </div>
                          <div className="order_box_body">
                            {/* Product Description */}
                            {productInfo?.rules && productInfo?.rules !== '<p></p>' && (
                              <>
                                <p className="_subtitle2 mt-2.5 mb-2">Description: </p>
                                <div className="_body2 text-[13px]">
                                  {ReactHtmlParser(productInfo?.rules)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Last Order Form --End-- */}


                        {/* Last Order Form --Start-- */}
                        <div className="_order_box_wrapper">
                          <div className="_order_box_header">
                            <div className="_order_header_step_circle"></div>
                            <h5 className="_order_header_title">
                              Last Order List
                            </h5>
                          </div>

                          <div className="order_box_body" style={{
                            overflow: 'scroll'
                          }}>
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Order ID</th>
                                  <th>Package Name</th>
                                  <th>Player ID</th>
                                  <th>Status</th>
                                  <th>DateTime</th>
                                </tr>
                              </thead>
                              <tbody>
                              {productOrder && productOrder.length > 0 &&
                                productOrder.map((po) => 
                                <tr key={po.id}>
                                  <td>{po.id}</td>
                                  <td>{po.name}</td>
                                  <td>{po.playerid}</td>
                                  <td>{po.status}</td>
                                  <td>{po.created_at}</td>
                                </tr>
                              )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {/* Last Order Form --End-- */}

                      </div>
                    );
                  }}
                </Formik>
                {/* Topup Order Form --End-- */}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default TopupOrderPage;
