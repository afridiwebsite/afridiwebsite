import { Formik } from "formik";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import moment from "moment";
import ReactHtmlParser from "react-html-parser";
import { HiOutlineExternalLink } from "react-icons/hi";
import { FaCoins, FaInfo, FaPlay } from "react-icons/fa";
import { GiTwoCoins } from "react-icons/gi";
import { useQuery } from "react-query";
//import ShowMoreText from 'react-show-more-text';
import Swal from "sweetalert2";
import * as Yup from "yup";
import api, {
  getTopupPackage,
  getUserProfile,
  getProductOrders,
  verifyPlayerInput,
  getMyOrderedOncePackages,
} from "../../api/api";
import ActivityIndicator from "../../components/ActivityIndicator";
import Alert from "../../components/Alert";
import Button from "../../components/Button";
import FormikErrorMessage from "../../components/formik/FormikErrorMessage";
import FormikInput from "../../components/formik/FormikInput";
import SelectedRadio from "../../components/SelectedRadio";
import ShowErrorAfterSubmit from "../../components/ShowErrorAfterSubmit";
// Note: SelectedRadio is still used for payment methods below.
import { __site_name_1, __site_name_2 } from "../../config/globalConfig";
import reactQueryConfig from "../../config/reactQueryConfig";
import routes from "../../config/routes";
import {
  addRedirectQuery,
  getErrors,
  hasData,
  imgPath,
  scrollTopWindow,
  setFlashMessage,
} from "../../helpers/helpers";
import { globalContext } from "../_app";

function TopupOrderPage() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [serverError, setServerError] = useState(null);
  // Pack whose description modal is currently open. null = closed.
  const [descPack, setDescPack] = useState(null);
  const { isAuth, updateAuthUserInfo, authUser } = useContext(globalContext);
  const router = useRouter();
  const product_id = router.query.id;

  // Refetching User Data On Every Time user visit this page
  const { data: userProfileData } = useQuery("user-profile", getUserProfile, {
    ...reactQueryConfig,
    enabled: !!isAuth,
  });
  useEffect(() => {
    setSelectedPaymentMethod("pay");
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
  } = useQuery("get-topup-product", () => getTopupPackage(product_id), {
    ...reactQueryConfig,
    enabled: !!product_id,
  });

  const { data: productOrder } = useQuery(
    "get-product-order",
    () => getProductOrders(product_id),
    {
      ...reactQueryConfig,
      enabled: !!product_id,
    },
  );

  // Order-once: pull the IDs of order_once packages this user has already
  // claimed so we can disable the matching pack cards below.
  const { data: orderedOnceData } = useQuery(
    "my-ordered-once-packages",
    getMyOrderedOncePackages,
    {
      ...reactQueryConfig,
      enabled: !!isAuth,
    },
  );
  const orderedOnceIds = new Set(
    (orderedOnceData?.data?.data?.ordered_package_ids || []).map(Number),
  );

  const productInfo = productData?.product;
  const packages = productData?.packages;

  // Admin-defined dynamic inputs (title + optional verify config). When the
  // product has any, they replace the legacy hardcoded Player-ID branch in
  // the order form.
  const dynamicInputs = Array.isArray(productInfo?.inputs)
    ? [...productInfo.inputs].sort((a, b) => (a.serial || 0) - (b.serial || 0))
    : [];
  const hasDynamicInputs = dynamicInputs.length > 0;
  const playerIdInput = dynamicInputs.find((i) => i.is_player_id === 1);

  // Verify-button state. Keyed by input id so we can disable/show results
  // per-input independently.
  const [verifyState, setVerifyState] = useState({}); // { [id]: { loading, data, error } }
  const runVerify = async (input, value) => {
    if (!value) {
      setVerifyState((p) => ({
        ...p,
        [input.id]: { error: "Enter a value first" },
      }));
      return;
    }
    setVerifyState((p) => ({ ...p, [input.id]: { loading: true } }));
    try {
      const res = await verifyPlayerInput(input.id, value);
      const data = res?.data?.data || res?.data;
      setVerifyState((p) => ({ ...p, [input.id]: { data } }));
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Verification failed";
      setVerifyState((p) => ({ ...p, [input.id]: { error: msg } }));
    }
  };

  // ReactHtmlParser keeps wrapper tags even for blank input, so strip tags
  // and whitespace before deciding whether to show the description block.
  const hasDescription = !!productInfo?.rules
    ?.replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, "")
    .trim();

  const isActiveForTopup = productInfo?.isactivefortopup === 1 ? true : false;
  const displayUnipinVoucher = productInfo?.id === 15 ? "none" : "block";
  const isUnipinVoucher = productInfo?.id === 15 ? true : false;
  const hasPackages = Array.isArray(packages) && packages.length > 0;

  // Renumber sections so the step badges count 1, 2, 3… in render order even
  // when some sections are hidden (no packages, Unipin voucher, no admin-
  // defined inputs, etc). Account Info only shows when there's something to
  // fill in.
  const accountInfoVisible =
    displayUnipinVoucher !== "none" && hasDynamicInputs;
  let _step = 0;
  const rechargeStep = hasPackages ? ++_step : null;
  const accountInfoStep = accountInfoVisible ? ++_step : null;
  const paymentStep = ++_step;
  const rulesStep = ++_step;

  // Form Initial values. payment_mathod defaults to "pay" because the
  // Wallet radio is pre-selected visually on mount via `selectedPaymentMethod`;
  // initializing the Formik field to match avoids a hidden "Payment method
  // is required" validation failure when the user just selects a package
  // and hits Buy Now without explicitly clicking the radio.
  const initialValues = {
    playerid: isUnipinVoucher ? "UNIPIN_VOUCHER" : "",
    selectedpackage: null,
    payment_mathod: "pay",
    quantity: 1,
    // Seed a key for every non-PlayerID dynamic input so Formik tracks them.
    ...dynamicInputs.reduce((acc, inp) => {
      if (!inp.is_player_id) acc[`dyn_${inp.id}`] = "";
      return acc;
    }, {}),
  };

  const isVoucherProduct = productInfo?.is_voucher == 1;

  // Form Validation Schema — playerid is only required when a Player ID
  // dynamic input is configured (or the legacy isactivefortopup flag is set).
  // Likewise, `selectedpackage` is only required when the product actually
  // has packages to pick from — otherwise the form is in info-only mode and
  // the submit just records the dynamic input values.
  const requirePlayerId = !!playerIdInput;
  const validationSchema = Yup.object().shape({
    playerid: requirePlayerId
      ? Yup.string().required("Player ID is required").trim()
      : Yup.string().trim(),
    selectedpackage: hasPackages
      ? Yup.object().nullable().required("Select a package")
      : Yup.object().nullable(),
    payment_mathod: hasPackages
      ? Yup.string().required().trim().label("Payment method")
      : Yup.string().trim().nullable(),
  });

  return (
    <>
      <Head>
        <title>{productInfo?.name}</title>
      </Head>
      <section
        className={`topup-page-section pt-2 ${
          !hasData(productData)
            ? "flex-grow items-center flex justify-center flex-col"
            : ""
        }`}
      >
        {/* <div className="topup-page-decor" aria-hidden="true">
          <span className="topup-page-blob topup-page-blob-a" />
          <span className="topup-page-blob topup-page-blob-b" />
          <span className="topup-page-blob topup-page-blob-c" />
        </div> */}
        <div className="container relative">
          <ActivityIndicator
            data={productData}
            loading={isLoading}
            errorMsg="Topup product not found"
            error={isError ? error : undefined}
          />
          {hasData(productData) && (
            <>
              <div className="flex flex-col items-center gap-6 mb-8">
                <div className="relative w-full">
                  {!isAuth && (
                    <Alert
                      className="mb-4"
                      title="You must logged in to order. Please login first"
                      action={
                        <Link
                          href={routes.login.name + addRedirectQuery(router)}
                        >
                          <a>
                            <Button className="small">Login</Button>
                          </a>
                        </Link>
                      }
                    />
                  )}

                  {isAuth &&
                    Number(authUser?.wallet ?? 0) <= 0 &&
                    selectedPaymentMethod != "auto_payment" && (
                      <Alert
                        className="mb-4"
                        title={
                          "You do not have enough money to order, Please first add some money"
                        }
                        action={
                          <Link
                            href={
                              routes.addMoney.name + addRedirectQuery(router)
                            }
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
                        payment_mathod,
                      } = values;

                      // Info-only products (no packages) skip the Swal
                      // confirmation since there's no price to confirm.
                      const confirmHtml = selectedpackage
                        ? `<div class="_confirm_order_body">
                              <h4 class="_h4">Confirm Order</h4>
                              <p className="modal_sub_title">Your current wallet is <span class="_bold_it">৳${userWallet}</span></p>
                              <p className="modal_sub_title">You need <span class="_bold_it">৳${selectedpackage.price}</span> to purchase this product.</p>
                            </div>`
                        : `<div class="_confirm_order_body">
                              <h4 class="_h4">Submit details</h4>
                              <p className="modal_sub_title">This product has no packages configured — submit your details to record the order.</p>
                            </div>`;
                      Swal.fire({
                        title: false,
                        html: confirmHtml,
                        customClass: {
                          popup: "_confirm_order_modal_popup",
                          cancelButton: "_cancel_btn",
                          confirmButton: "_confirm_btn",
                        },
                        cancelButtonText: "Cancel",
                        confirmButtonText: "Confirm order",
                        showCancelButton: true,
                        cancelButtonColor: "red",
                      }).then((e) => {
                        if (e.isConfirmed && !isConfirmed) {
                          isConfirmed = true;
                          setSubmitting(true);
                          // Bundle non-Player-ID dynamic input values into a
                          // single ingameid string ("Label: value | …") so they
                          // get persisted alongside the order without needing
                          // schema changes on the order endpoint.
                          const dynExtras = dynamicInputs
                            .filter((inp) => !inp.is_player_id)
                            .map(
                              (inp) =>
                                `${inp.title}: ${values[`dyn_${inp.id}`] || ""}`,
                            )
                            .join(" | ");
                          api
                            .post("/packageorder", {
                              // When the product has no packages, send the
                              // product_id/name from the route and zero out
                              // package-specific fields so the server can
                              // still record the order as info-only.
                              topuppackage_id: selectedpackage?.id || null,
                              product_id:
                                selectedpackage?.product_id || product_id,
                              name:
                                selectedpackage?.name ||
                                productInfo?.name ||
                                "",
                              accounttype,
                              playerid,
                              ingameid: dynExtras || undefined,
                              ingamepassword: isActiveForTopup
                                ? "IDCODE"
                                : ingamepassword,
                              securitycode: isActiveForTopup
                                ? "IDCODE"
                                : securitycode,
                              payment_mathod: payment_mathod || "pay",
                              quantity: isVoucherProduct
                                ? Math.max(1, Number(values.quantity) || 1)
                                : 1,
                            })
                            .then((order_res) => {
                              if (
                                order_res.data?.message ==
                                  "Payment Initiated" ||
                                order_res.data?.message == "Payment Url"
                              ) {
                                setFlashMessage("Redirect Payment Gateway");
                                window.location.assign(
                                  order_res.data?.payment_url,
                                );
                              } else {
                                setFlashMessage(
                                  "Your order has been placed successfully.",
                                );
                                router.push(routes.myOrder.name);
                              }
                            })
                            .catch((err) => {
                              setSubmitting(false);
                              // Surface the actual server payload so we can
                              // diagnose 400/500s instead of just seeing a
                              // generic toast. `getErrors` extracts the user-
                              // facing message; the console log keeps the
                              // full response around for devtools.
                              console.error(
                                "[packageorder] failed:",
                                err?.response?.status,
                                err?.response?.data || err?.message,
                              );
                              const message =
                                err?.response?.data?.message ||
                                getErrors(err) ||
                                "Could not place the order. Please try again.";
                              setServerError(message);
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
                        errors["accounttype"] && touched["accounttype"];

                      const isPackageIdError =
                        errors["selectedpackage"] && touched["selectedpackage"];

                      const isPaymentError = errors["payment_mathod"];
                      //const isPaymentError = errors['payment_mathod'] && touched['payment_mathod'];

                      // Voucher products can be ordered in quantities — they
                      // pull N vouchers from the pool. Non-voucher products
                      // implicitly use quantity 1.
                      const orderQuantity = isVoucherProduct
                        ? Math.max(1, Number(values.quantity) || 1)
                        : 1;
                      const totalCost =
                        Number(values.selectedpackage?.price || 0) *
                        orderQuantity;
                      const isNotEnoughMoney =
                        totalCost > Number(authUser?.wallet || 0);

                      console.log(
                        "errors",
                        isAccountTypeError,
                        isPaymentError,
                        isPackageIdError,
                        isNotEnoughMoney,
                        errors,
                      );

                      return (
                        <div className="mt-6">
                          {isSubmitting && (
                            <div className="_absolute_full z-50"></div>
                          )}

                          {/* Select Recharge --Start-- */}
                          {hasPackages &&
                            (() => {
                              const selectedCoin = Number(
                                values.selectedpackage?.coin_value || 0,
                              );
                              return (
                                <div
                                  className="_order_box_wrapper animate-fade-in-up"
                                  style={{ animationDelay: "80ms" }}
                                >
                                  <div className="_order_box_header">
                                    <div className="_order_header_step_circle">
                                      {rechargeStep}
                                    </div>
                                    <h5 className="_order_header_title">
                                      Select Recharge
                                    </h5>
                                    {/* Coin reward only surfaces here when a
                                    package is selected — pulled out of the
                                    cards so they stay clean. */}
                                    {selectedCoin > 0 && (
                                      <span className="topup-pack-header-coin">
                                        <GiTwoCoins /> +{selectedCoin} coins
                                      </span>
                                    )}
                                  </div>

                                  <div className="order_box_body">
                                    {productInfo?.is_offer == 1 && (
                                      <div className="topup-stock-badge animate-fade-in">
                                        <span
                                          className="topup-stock-dot"
                                          aria-hidden="true"
                                        />
                                        Available Stock:{" "}
                                        <strong>
                                          {productInfo?.offer_items}
                                        </strong>
                                      </div>
                                    )}

                                    <div className="topup-pack-grid">
                                      {/* Single Recharge --Start-- */}
                                      {packages.map((pack, index) => {
                                        const outOfStock =
                                          parseInt(pack?.in_stock) === 0;
                                        // order_once only applies when the
                                        // product has a Player ID input —
                                        // otherwise we can't scope "used"
                                        // to a player, so there's no impact.
                                        const alreadyOrdered =
                                          pack?.order_once == 1 &&
                                          !!playerIdInput &&
                                          orderedOnceIds.has(Number(pack?.id));
                                        const isDisabled =
                                          outOfStock || alreadyOrdered;
                                        const isSelected =
                                          parseInt(selectedPackage) === index;
                                        const packCoin = Number(
                                          pack?.coin_value || 0,
                                        );
                                        const hasPackDescription =
                                          !!pack?.description
                                            ?.replace(/<[^>]*>/g, "")
                                            .replace(/&nbsp;/gi, "")
                                            .trim();
                                        return (
                                          <div
                                            key={index}
                                            className={`topup-pack-card animate-fade-in-up ${
                                              isSelected ? "is-selected" : ""
                                            } ${isDisabled ? "is-out" : ""} ${
                                              alreadyOrdered ? "is-claimed" : ""
                                            } ${
                                              isPackageIdError && !isSelected
                                                ? "is-error"
                                                : ""
                                            }`}
                                            style={{
                                              animationDelay: `${
                                                Math.min(index, 10) * 50
                                              }ms`,
                                            }}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (isDisabled) return;
                                                setSelectedPackage(index);
                                                setFieldValue(
                                                  "selectedpackage",
                                                  pack,
                                                );
                                                setSelectedPaymentMethod("pay");
                                                setFieldValue(
                                                  "payment_mathod",
                                                  "pay",
                                                );
                                              }}
                                              disabled={isDisabled}
                                              className="topup-pack-card-btn h-full"
                                            >
                                              {outOfStock && (
                                                <span className="topup-pack-card-stock">
                                                  Out of stock
                                                </span>
                                              )}
                                              {!outOfStock &&
                                                alreadyOrdered && (
                                                  <span className="topup-pack-card-stock topup-pack-card-stock--claimed">
                                                    Already claimed
                                                  </span>
                                                )}
                                              {/* Foreground image column — sits
                                              above the bottom-row text. When
                                              the package has no logo, render
                                              a same-height empty placeholder
                                              so cards in a row keep an even
                                              shape. */}
                                              {pack?.logo ? (
                                                <span
                                                  className="topup-pack-card-img"
                                                  aria-hidden="true"
                                                >
                                                  <img
                                                    src={imgPath(pack.logo)}
                                                    alt=""
                                                  />
                                                </span>
                                              ) : (
                                              <></>
                                              )}
                                              {/* Single bottom row: name + price
                                              side by side. A small rounded
                                              check sits next to the name
                                              while the package is selected. */}
                                              <span className="topup-pack-card-row">
                                                <span className="topup-pack-card-name-wrap">
                                                  {isSelected && (
                                                    <span
                                                      className="topup-pack-card-check-inline"
                                                      aria-hidden="true"
                                                      title="Selected"
                                                    >
                                                      ✓
                                                    </span>
                                                  )}
                                                  <span>{pack?.name}</span>
                                                </span>
                                                <span className="topup-pack-card-price">
                                                  ৳ {pack?.price}
                                                </span>
                                              </span>
                                            </button>
                                            {/* Info button — hidden while the
                                                package is out-of-stock /
                                                already-claimed so the stock
                                                badge has the corner to itself
                                                and we don't dangle a tappable
                                                control on a disabled card. */}
                                            {hasPackDescription && !isDisabled && (
                                              <span className="topup-pack-card-info-wrap">
                                                <button
                                                  type="button"
                                                  className="topup-pack-card-info"
                                                  aria-label="Package details"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDescPack(pack);
                                                  }}
                                                >
                                                  <FaInfo />
                                                </button>
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {/* Single Recharge --End-- */}
                                    </div>
                                    {/* Quantity stepper — voucher-pool products
                                        can be bought in bulk. One mapped
                                        voucher emitted per unit. */}
                                    {isVoucherProduct &&
                                      values.selectedpackage && (
                                        <div className="topup-quantity-row mt-4 flex items-center gap-3 flex-wrap">
                                          <label className="text-sm font-semibold text-gray-700">
                                            Quantity
                                          </label>
                                          <div className="inline-flex items-center border border-gray-300 rounded overflow-hidden">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setFieldValue(
                                                  "quantity",
                                                  Math.max(
                                                    1,
                                                    (Number(values.quantity) ||
                                                      1) - 1,
                                                  ),
                                                )
                                              }
                                              className="px-3 py-1 text-lg font-bold bg-gray-50 hover:bg-gray-100"
                                              aria-label="Decrease quantity"
                                            >
                                              −
                                            </button>
                                            <input
                                              type="number"
                                              min="1"
                                              value={values.quantity || 1}
                                              onChange={(e) =>
                                                setFieldValue(
                                                  "quantity",
                                                  Math.max(
                                                    1,
                                                    parseInt(
                                                      e.target.value || "1",
                                                      10,
                                                    ),
                                                  ),
                                                )
                                              }
                                              className="w-14 text-center py-1 border-0 focus:outline-none"
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setFieldValue(
                                                  "quantity",
                                                  (Number(values.quantity) ||
                                                    1) + 1,
                                                )
                                              }
                                              className="px-3 py-1 text-lg font-bold bg-gray-50 hover:bg-gray-100"
                                              aria-label="Increase quantity"
                                            >
                                              +
                                            </button>
                                          </div>
                                          <span className="text-sm text-gray-600">
                                            Total:{" "}
                                            <strong className="text-gray-900">
                                              ৳ {totalCost.toFixed(2)}
                                            </strong>
                                          </span>
                                        </div>
                                      )}

                                    <FormikErrorMessage name="selectedpackage" />
                                    <FormikErrorMessage
                                      showError={
                                        isNotEnoughMoney &&
                                        selectedPaymentMethod != "auto_payment"
                                      }
                                      msg={
                                        <p>
                                          You do not have enough money to order
                                          this package, Please{" "}
                                          {
                                            <Link
                                              href={
                                                routes.addMoney.name +
                                                addRedirectQuery(router)
                                              }
                                            >
                                              <a className="_link">Add Money</a>
                                            </Link>
                                          }{" "}
                                          or choose another package.
                                        </p>
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          {/* Select Recharge --End-- */}

                          {/* Account Info Form --Start-- */}
                          {accountInfoVisible && (
                            <div
                              className="_order_box_wrapper animate-fade-in-up"
                              style={{
                                animationDelay: "140ms",
                              }}
                            >
                              <div className="_order_box_header">
                                <div className="_order_header_step_circle">
                                  {accountInfoStep}
                                </div>
                                <h5 className="_order_header_title">
                                  Account Info
                                </h5>
                              </div>

                              <div className="order_box_body">
                                {
                                  // Account Info renders strictly from the admin-
                                  // defined dynamic inputs. No more hardcoded
                                  // Player ID / Account Type / Password branches.
                                }
                                <div className="flex flex-col gap-3">
                                  {dynamicInputs.map((inp) => {
                                    const fieldName = inp.is_player_id
                                      ? "playerid"
                                      : `dyn_${inp.id}`;
                                    const vState = verifyState[inp.id] || {};
                                    const showVerify = !!inp.verify_player_name;
                                    return (
                                      <div key={inp.id} className="_grid_2">
                                        <div>
                                          <FormikInput
                                            label={inp.title}
                                            placeholder={`Enter ${inp.title}`}
                                            className="small"
                                            name={fieldName}
                                          />
                                          {showVerify && (
                                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                              <button
                                                type="button"
                                                disabled={vState.loading}
                                                onClick={() =>
                                                  runVerify(
                                                    inp,
                                                    values[fieldName],
                                                  )
                                                }
                                                className="topup-verify-btn"
                                              >
                                                {vState.loading
                                                  ? "Verifying…"
                                                  : `Verify ${inp.title}`}
                                              </button>
                                              {vState.error && (
                                                <span className="text-xs text-red-600">
                                                  {vState.error}
                                                </span>
                                              )}
                                              {vState.data &&
                                                !vState.error &&
                                                (() => {
                                                  const info =
                                                    vState.data.player_info ||
                                                    vState.data;
                                                  const nickname =
                                                    info?.nickname;
                                                  const level = info?.level;
                                                  if (
                                                    !nickname &&
                                                    level == null
                                                  ) {
                                                    return (
                                                      <span className="text-xs text-emerald-700 font-medium">
                                                        Verified
                                                      </span>
                                                    );
                                                  }
                                                  return (
                                                    <span className="topup-verify-result">
                                                      {nickname && (
                                                        <span className="topup-verify-chip">
                                                          <span className="topup-verify-chip-label">
                                                            Nickname
                                                          </span>
                                                          <strong>
                                                            {nickname}
                                                          </strong>
                                                        </span>
                                                      )}
                                                      {level != null && (
                                                        <span className="topup-verify-chip">
                                                          <span className="topup-verify-chip-label">
                                                            Level
                                                          </span>
                                                          <strong>
                                                            {level}
                                                          </strong>
                                                        </span>
                                                      )}
                                                    </span>
                                                  );
                                                })()}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Account Info Form --End-- */}

                          {/* Select Payment Option --Start-- */}
                          <div
                            className="_order_box_wrapper animate-fade-in-up"
                            style={{ animationDelay: "200ms" }}
                          >
                            <div className="_order_box_header">
                              <div className="_order_header_step_circle">
                                {paymentStep}
                              </div>
                              <h5 className="_order_header_title">
                                Select Payment
                              </h5>
                            </div>

                            <div className="order_box_body">
                              <div className="flex w-full max-w-[600px] max-h-[110px] gap-3">
                                <button
                                  type="button"
                                  className={`topup-pay-card ${
                                    selectedPaymentMethod === "pay"
                                      ? "is-selected"
                                      : ""
                                  } ${
                                    isPaymentError &&
                                    selectedPaymentMethod !== "pay"
                                      ? "is-error"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    setSelectedPaymentMethod("pay");
                                    setFieldValue("payment_mathod", "pay");
                                  }}
                                >
                                  <div className="topup-pay-card-body">
                                    <img
                                      src="/logo.jpeg"
                                      alt=""
                                      className="topup-pay-card-img"
                                    />
                                  </div>
                                  <div className="topup-pay-card-cta">
                                    Wallet Pay
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  className={`topup-pay-card ${
                                    selectedPaymentMethod === "auto_payment"
                                      ? "is-selected"
                                      : ""
                                  } ${
                                    isPaymentError &&
                                    selectedPaymentMethod !== "auto_payment"
                                      ? "is-error"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    setSelectedPaymentMethod("auto_payment");
                                    setFieldValue(
                                      "payment_mathod",
                                      "auto_payment",
                                    );
                                  }}
                                >
                                  <div className="topup-pay-card-body">
                                    <img
                                      src="/auto_payment.jpeg"
                                      alt=""
                                      className="topup-pay-card-img"
                                    />
                                  </div>
                                  <div className="topup-pay-card-cta">
                                    Instant Pay
                                  </div>
                                </button>
                              </div>

                              {/* Account-balance + required-amount info rows
                                  shown below the payment cards (matches the
                                  reference layout). */}
                              <div className="topup-pay-info-rows">
                                <div className="topup-pay-info">
                                  <FaInfo className="topup-pay-info-icon" />
                                  <span className="topup-pay-info-label">
                                    Your account balance:
                                  </span>
                                  <strong className="topup-pay-info-value">
                                    ৳ {Number(authUser?.wallet ?? 0).toFixed(2)}
                                  </strong>
                                </div>
                                {values.selectedpackage && (
                                  <div className="topup-pay-info">
                                    <FaInfo className="topup-pay-info-icon" />
                                    <span className="topup-pay-info-label">
                                      You need to purchase this product:
                                    </span>
                                    <strong className="topup-pay-info-value">
                                      ৳ {totalCost.toFixed(2)}
                                      {isVoucherProduct && orderQuantity > 1 && (
                                        <span className="text-xs font-normal text-gray-500 ml-1">
                                          ({orderQuantity} ×{" "}
                                          {values.selectedpackage.price})
                                        </span>
                                      )}
                                    </strong>
                                  </div>
                                )}
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
                            className="topup-cta-bar topup-cta-bar--centered animate-fade-in-up mb-2"
                            style={{ animationDelay: "260ms" }}
                          >
                            <div className="flex items-center gap-3">
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
                              {((isAuth &&
                                Number(authUser?.wallet ?? 0) <= 0 &&
                                selectedPaymentMethod != "auto_payment") ||
                                (isNotEnoughMoney &&
                                  selectedPaymentMethod != "auto_payment")) && (
                                <Link
                                  href={
                                    routes.addMoney.name +
                                    addRedirectQuery(router)
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
                                  !isAuth ||
                                  (Number(authUser?.wallet ?? 0) <= 0 &&
                                    selectedPaymentMethod != "auto_payment") ||
                                  (isNotEnoughMoney &&
                                    selectedPaymentMethod != "auto_payment")
                                }
                                onClick={handleSubmit}
                                type="submit"
                                loading={isSubmitting}
                                className="primary topup-buy-now px-14 py-3 text-base"
                              >
                                {selectedPaymentMethod === "auto_payment"
                                  ? "Pay Now"
                                  : "Buy Now"}
                              </Button>
                            </div>
                          </div>

                          {productInfo?.youtube_link && (
                            <a
                              href={productInfo.youtube_link}
                              target="_blank"
                              rel="noreferrer"
                              className="topup-watch-tutorial-btn animate-fade-in-up"
                              style={{ animationDelay: "290ms" }}
                            >
                              <span>Watch Now</span>
                              <FaPlay className="play-icon" />
                            </a>
                          )}

                          {/* Rules & Conditions Section --Start-- */}
                          {hasDescription && (
                            <div
                              className="_order_box_wrapper animate-fade-in-up mt-2"
                              style={{ animationDelay: "320ms" }}
                            >
                              <div className="_order_box_header">
                                <div className="_order_header_step_circle">
                                {rulesStep}
                                </div>
                                <h5 className="_order_header_title">
                                  Rules &amp; Conditions
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
        {descPack && (
          <div
            className="topup-desc-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${descPack.name} details`}
            onClick={() => setDescPack(null)}
          >
            <div
              className="topup-desc-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="topup-desc-modal-head">
                <h4 className="topup-desc-modal-title">{descPack.name}</h4>
                <button
                  type="button"
                  className="topup-desc-modal-close"
                  aria-label="Close"
                  onClick={() => setDescPack(null)}
                >
                  ×
                </button>
              </div>
              <div className="topup-desc-modal-body">
                {ReactHtmlParser(descPack.description)}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default TopupOrderPage;
