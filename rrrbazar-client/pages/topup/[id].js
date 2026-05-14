import { Formik } from 'formik';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import moment from 'moment';
import ReactHtmlParser from 'react-html-parser';
import { HiOutlineExternalLink, HiSparkles } from 'react-icons/hi';
import { FaShieldAlt, FaBolt, FaHeadset, FaCoins, FaUserCircle } from 'react-icons/fa';
import { GiTwoCoins, GiCoins } from 'react-icons/gi';
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
// Note: SelectedRadio is still used for payment methods below.
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

  // ReactHtmlParser keeps wrapper tags even for blank input, so strip tags
  // and whitespace before deciding whether to show the description block.
  const hasDescription = !!productInfo?.rules
    ?.replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .trim();

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
        className={`topup-page-section mb-7 ${
          !hasData(productData)
            ? 'flex-grow items-center flex justify-center flex-col'
            : ''
        }`}
      >
        <div className="topup-page-decor" aria-hidden="true">
          <span className="topup-page-blob topup-page-blob-a" />
          <span className="topup-page-blob topup-page-blob-b" />
          <span className="topup-page-blob topup-page-blob-c" />
        </div>
        <div className="container relative">
          <ActivityIndicator
            data={productData}
            loading={isLoading}
            errorMsg="Topup product not found"
            error={isError ? error : undefined}
          />
          {hasData(productData) && (
            <>
              <div className="topup-page-hero animate-fade-in-up">
                <span className="topup-page-hero-eyebrow">
                  <HiSparkles className="topup-page-hero-eyebrow-icon" />
                  Instant Top-up
                </span>
                <h1 className="topup-page-hero-title">
                  Power up your <span className="topup-page-hero-accent">{productInfo?.name}</span>
                </h1>
                <p className="topup-page-hero-sub">
                  Pick a package, drop your ID and grab your coins in minutes —
                  delivered straight to your account.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[400px,auto] gap-7">
              {/* Topup Product Info And Rules --Start-- */}
              <div className="animate-fade-in-up" style={{ animationDelay: '40ms' }}>
                <div className="topup-product-card topup-product-card--hero">
                  {/* Top up Image */}
                  <div className="topup-product-banner">
                    <img
                      src={imgPath(productInfo?.logo)}
                      className="w-full h-[180px] object-cover"
                      alt=""
                    />
                    <div className="topup-product-banner-overlay" />
                    <span className="topup-product-banner-badge">
                      <FaShieldAlt /> Verified Seller
                    </span>
                    <span className="topup-product-banner-coin" aria-hidden="true">
                      <FaCoins />
                    </span>
                  </div>
                  <div className="topup-product-meta">
                    {/* Product name */}
                    <h5 className="topup-product-name">
                      {productInfo?.name}
                    </h5>

                    <div className="topup-trust-row">
                      <div className="topup-trust-item topup-trust-item--emerald">
                        <FaBolt /> <span>Instant</span>
                      </div>
                      <div className="topup-trust-item topup-trust-item--blue">
                        <FaShieldAlt /> <span>Secure</span>
                      </div>
                      <div className="topup-trust-item topup-trust-item--violet">
                        <FaHeadset /> <span>24/7</span>
                      </div>
                    </div>

                    {/* Product Description */}
                    {hasDescription && (
                      <div className="topup-product-desc">
                        <p className="topup-product-desc-title">
                          <HiSparkles /> About this top-up
                        </p>
                        <div className="_body2 text-[13px] text-gray-700">
                          {ReactHtmlParser(productInfo?.rules)}
                        </div>
                      </div>
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
                            if (order_res.data?.message == 'Payment Initiated' || order_res.data?.message == 'Payment Url') {
                              setFlashMessage(
                                'Redirect Payment Gateway'
                              );
                              window.location.assign(order_res.data?.payment_url)
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

                    const hasSelectedPackage = !!values.selectedpackage;
                    const selectedCoinValue = Number(
                      values.selectedpackage?.coin_value || 0
                    );

                    return (
                      <div>
                        {isSubmitting && (
                          <div className="_absolute_full z-50"></div>
                        )}

                        {/* Animated Coin Reward Preview --Start-- */}
                        <div
                          className={`topup-coin-preview animate-fade-in-up ${
                            hasSelectedPackage ? 'is-active' : ''
                          }`}
                          style={{ animationDelay: '60ms' }}
                          aria-live="polite"
                        >
                          <div
                            className="topup-coin-preview-glow"
                            aria-hidden="true"
                          />
                          <div
                            className="topup-coin-stage"
                            aria-hidden="true"
                          >
                            <span className="topup-coin topup-coin--1">
                              <FaCoins />
                            </span>
                            <span className="topup-coin topup-coin--2">
                              <GiTwoCoins />
                            </span>
                            <span className="topup-coin topup-coin--3">
                              <GiCoins />
                            </span>
                            <span className="topup-coin topup-coin--4">
                              <FaCoins />
                            </span>
                            <span className="topup-coin topup-coin--5">
                              <GiTwoCoins />
                            </span>
                            <span className="topup-coin-sparkle topup-coin-sparkle--a">
                              <HiSparkles />
                            </span>
                            <span className="topup-coin-sparkle topup-coin-sparkle--b">
                              <HiSparkles />
                            </span>
                          </div>
                          <div className="topup-coin-preview-text">
                            <span className="topup-coin-preview-label">
                              {hasSelectedPackage ? 'Your reward' : 'Coin rewards'}
                            </span>
                            <h3 className="topup-coin-preview-title">
                              {hasSelectedPackage
                                ? values.selectedpackage.name
                                : 'Pick a package to reveal your bounty'}
                            </h3>
                            <div className="topup-coin-preview-row">
                              {hasSelectedPackage ? (
                                <>
                                  <span className="topup-coin-preview-amount">
                                    ৳ {values.selectedpackage.price}
                                  </span>
                                  {selectedCoinValue > 0 && (
                                    <span className="topup-coin-preview-reward">
                                      <FaCoins />
                                      +{selectedCoinValue} coins
                                    </span>
                                  )}
                                  <span className="topup-coin-preview-tag">
                                    delivered instantly
                                  </span>
                                </>
                              ) : (
                                <span className="topup-coin-preview-hint">
                                  Each package awards bonus coins — pick one to see how many.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Animated Coin Reward Preview --End-- */}

                        {/* Account Info Form --Start-- */}
                        <div
                          className="_order_box_wrapper animate-fade-in-up"
                          style={{
                            display: displayUnipinVoucher,
                            animationDelay: '80ms',
                          }}
                        >
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
                        <div
                          className="_order_box_wrapper animate-fade-in-up"
                          style={{ animationDelay: '140ms' }}
                        >
                          <div className="_order_box_header">
                            <div className="_order_header_step_circle">2</div>
                            <h5 className="_order_header_title">
                              Select Recharge
                            </h5>
                          </div>

                          <div className="order_box_body">
                            {productInfo?.is_offer == 1 && (
                              <div className="topup-stock-badge animate-fade-in">
                                <span className="topup-stock-dot" aria-hidden="true" />
                                Available Stock: <strong>{productInfo?.offer_items}</strong>
                              </div>
                            )}

                            <div className="topup-pack-grid">
                              {/* Single Recharge --Start-- */}
                              {packages.map((pack, index) => {
                                const outOfStock =
                                  parseInt(pack?.in_stock) === 0;
                                const isSelected =
                                  parseInt(selectedPackage) === index;
                                const packCoin = Number(pack?.coin_value || 0);
                                // Cycle through theme-driven tints (primary,
                                // accent) plus gold for the coin theme.
                                const tint = [
                                  'gold',
                                  'primary',
                                  'accent',
                                ][index % 3];
                                return (
                                  <button
                                    type="button"
                                    key={index}
                                    onClick={() => {
                                      if (outOfStock) return;
                                      setSelectedPackage(index);
                                      setFieldValue('selectedpackage', pack);
                                      setSelectedPaymentMethod('pay');
                                      setFieldValue('payment_mathod', 'pay');
                                    }}
                                    disabled={outOfStock}
                                    className={`topup-pack-card topup-pack-card--${tint} animate-fade-in-up ${
                                      isSelected ? 'is-selected' : ''
                                    } ${outOfStock ? 'is-out' : ''} ${
                                      isPackageIdError && !isSelected
                                        ? 'is-error'
                                        : ''
                                    }`}
                                    style={{
                                      animationDelay: `${
                                        Math.min(index, 10) * 50
                                      }ms`,
                                    }}
                                  >
                                    {outOfStock && (
                                      <span className="topup-pack-card-stock">
                                        Out of stock
                                      </span>
                                    )}
                                    {isSelected && (
                                      <span
                                        className="topup-pack-card-check"
                                        aria-hidden="true"
                                      >
                                        ✓
                                      </span>
                                    )}
                                    <span
                                      className="topup-pack-card-coin"
                                      aria-hidden="true"
                                    >
                                      <FaCoins />
                                    </span>
                                    <span className="topup-pack-card-name">
                                      {pack?.name}
                                    </span>
                                    <span className="topup-pack-card-price">
                                      ৳ {pack?.price}
                                    </span>
                                    {packCoin > 0 && (
                                      <span className="topup-pack-card-reward">
                                        <GiTwoCoins /> +{packCoin}
                                      </span>
                                    )}
                                  </button>
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
                        <div
                          className="_order_box_wrapper animate-fade-in-up"
                          style={{ animationDelay: '200ms' }}
                        >
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

                        <div
                          className="topup-cta-bar animate-fade-in-up"
                          style={{ animationDelay: '260ms' }}
                        >
                          {values.selectedpackage && (
                            <div className="topup-cta-summary">
                              <span className="topup-cta-label">Total</span>
                              <span className="topup-cta-amount">
                                ৳ {values.selectedpackage.price}
                              </span>
                              <span className="topup-cta-pack">
                                {values.selectedpackage.name}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 ml-auto">
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
                              className="primary topup-buy-now"
                            >
                              Buy Now
                            </Button>
                          </div>
                        </div>

                        <br /><br /><br />

                        {/* Description Section --Start-- */}
                        {hasDescription && (
                          <div
                            className="_order_box_wrapper animate-fade-in-up"
                            style={{ animationDelay: '320ms' }}
                          >
                            <div className="_order_box_header">
                              <div className="_order_header_step_circle">i</div>
                              <h5 className="_order_header_title">
                                Description
                              </h5>
                            </div>
                            <div className="order_box_body">
                              <div className="_body2 text-[13px]">
                                {ReactHtmlParser(productInfo?.rules)}
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Description Section --End-- */}


                        {/* Last Order Form --Start-- */}
                        <div
                          className="_order_box_wrapper animate-fade-in-up"
                          style={{ animationDelay: '380ms' }}
                        >
                          <div className="_order_box_header">
                            <div className="_order_header_step_circle">📜</div>
                            <h5 className="_order_header_title">
                              Last Order List
                            </h5>
                          </div>

                          <div className="order_box_body topup-orders-body">
                            {productOrder && productOrder.length > 0 ? (
                              <ul className="topup-orders-list">
                                {productOrder.map((po, idx) => {
                                  const statusKey = String(po.status || '')
                                    .toLowerCase()
                                    .trim();
                                  const orderUser = po.User || po.user;
                                  const orderProduct =
                                    po.TopupProduct || po.product || productInfo;
                                  const displayName =
                                    orderUser?.username ||
                                    (orderUser?.email
                                      ? orderUser.email.split('@')[0]
                                      : 'Anonymous Player');
                                  const initial = (
                                    displayName?.[0] || '?'
                                  ).toUpperCase();
                                  // created_at is pre-formatted by API moment getter;
                                  // moment can parse most formats — fall back to raw
                                  // string if it can't.
                                  const m = moment(po.created_at);
                                  const timeLabel = m.isValid()
                                    ? m.fromNow()
                                    : po.created_at;
                                  const timeAbs = m.isValid()
                                    ? m.format('MMM D, YYYY · h:mm A')
                                    : po.created_at;
                                  return (
                                    <li
                                      key={po.id}
                                      className="topup-order-row animate-fade-in-up"
                                      style={{
                                        animationDelay: `${
                                          Math.min(idx, 8) * 40
                                        }ms`,
                                      }}
                                    >
                                      <div className="topup-order-row-avatar">
                                        {orderUser?.avatar ? (
                                          <img
                                            src={orderUser.avatar}
                                            alt=""
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                              e.currentTarget.style.display =
                                                'none';
                                              e.currentTarget.parentElement.classList.add(
                                                'is-fallback',
                                              );
                                            }}
                                          />
                                        ) : null}
                                        <span className="topup-order-row-avatar-fallback">
                                          {initial}
                                        </span>
                                      </div>

                                      <div className="topup-order-row-main">
                                        <div className="topup-order-row-line">
                                          <span className="topup-order-row-user">
                                            {displayName}
                                          </span>
                                          <span className="topup-order-row-id">
                                            #{po.id}
                                          </span>
                                        </div>
                                        <div className="topup-order-row-meta">
                                          {orderProduct?.logo && (
                                            <img
                                              className="topup-order-row-product-logo"
                                              src={imgPath(orderProduct.logo)}
                                              alt=""
                                            />
                                          )}
                                          <span className="topup-order-row-product">
                                            {orderProduct?.name || 'Top-up'}
                                          </span>
                                          <span className="topup-order-row-dot" />
                                          <span className="topup-order-row-pack">
                                            {po.name}
                                          </span>
                                          {po.playerid && (
                                            <>
                                              <span className="topup-order-row-dot" />
                                              <span className="topup-order-row-player">
                                                ID: {po.playerid}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <div className="topup-order-row-side">
                                        <span
                                          className={`topup-status-badge topup-status-badge--${statusKey}`}
                                        >
                                          <span
                                            className="topup-status-dot"
                                            aria-hidden="true"
                                          />
                                          {po.status}
                                        </span>
                                        <span
                                          className="topup-order-row-time"
                                          title={timeAbs}
                                        >
                                          {timeLabel}
                                        </span>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <div className="topup-orders-empty">
                                <FaCoins className="topup-orders-empty-icon" />
                                <p>No orders yet — your first reward is one click away.</p>
                              </div>
                            )}
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
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default TopupOrderPage;
