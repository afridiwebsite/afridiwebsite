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
import { useQuery, useQueryClient } from "react-query";
//import ShowMoreText from 'react-show-more-text';
import Swal from "sweetalert2";
import * as Yup from "yup";
import api, {
  getTopupPackage,
  getUserProfile,
  getProductOrders,
  verifyPlayerInput,
  verifyPackageInput,
  getMyOrderedOncePackages,
} from "../../api/api";
import ActivityIndicator from "../../components/ActivityIndicator";
import Alert from "../../components/Alert";
import Button from "../../components/Button";
import FormikErrorMessage from "../../components/formik/FormikErrorMessage";
import FormikInput from "../../components/formik/FormikInput";
import SelectedRadio from "../../components/SelectedRadio";
import ShowErrorAfterSubmit from "../../components/ShowErrorAfterSubmit";
import NoticePopup from "../../components/notice-popup/NoticePopup";
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
  const { isAuth, updateAuthUserInfo, authUser, siteSettings } =
    useContext(globalContext);
  const router = useRouter();
  const queryClient = useQueryClient();
  const product_id = router.query.id;

  // Wallet Pay tile image: admin-configured via SiteSettings. Falls back to
  // the bundled logo so existing setups don't render a broken image until the
  // admin uploads one.
  const walletPayImage =
    siteSettings?.wallet_pay_image_full_url || "/logo.jpeg";

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

  // When the admin enables "Override product inputs" on a package, the
  // selected package's own inputs swap in for the product-level set. We
  // need it reactive to package selection, so this depends on
  // `selectedPackage` (which is the index of the picked package).
  const selectedPackageObj =
    typeof selectedPackage === "number" && Array.isArray(packages)
      ? packages[selectedPackage]
      : null;
  const useCustomPackageInputs =
    !!selectedPackageObj &&
    Number(selectedPackageObj.has_custom_inputs) === 1 &&
    Array.isArray(selectedPackageObj.inputs) &&
    selectedPackageObj.inputs.length > 0;
  const dynamicInputsSource = useCustomPackageInputs
    ? selectedPackageObj.inputs
    : productInfo?.inputs;
  const dynamicInputs = Array.isArray(dynamicInputsSource)
    ? [...dynamicInputsSource].sort((a, b) => (a.serial || 0) - (b.serial || 0))
    : [];
  const hasDynamicInputs = dynamicInputs.length > 0;
  const playerIdInput = dynamicInputs.find((i) => i.is_player_id === 1);
  // Route verify lookups to the right backend based on which scope the
  // current input set came from.
  const verifyInputApi = useCustomPackageInputs
    ? verifyPackageInput
    : verifyPlayerInput;

  // Verify-button state. Keyed by input id so we can disable/show results
  // per-input independently. `value` is captured at verify time so we can
  // detect post-verification edits (gamerspay checks become stale if the
  // customer changes the ID after passing once).
  const [verifyState, setVerifyState] = useState({}); // { [id]: { loading, data, error, value } }
  const runVerify = async (input, value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      setVerifyState((p) => ({
        ...p,
        [input.id]: { error: "Enter a value first" },
      }));
      return;
    }
    setVerifyState((p) => ({
      ...p,
      [input.id]: { loading: true, value: trimmed },
    }));
    try {
      const res = await verifyInputApi(input.id, trimmed);
      const data = res?.data?.data || res?.data;
      setVerifyState((p) => ({
        ...p,
        [input.id]: { data, value: trimmed },
      }));
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Verification failed";
      setVerifyState((p) => ({
        ...p,
        [input.id]: { error: msg, value: trimmed },
      }));
    }
  };

  // True iff the Player ID input requires the GamersPay validate call AND
  // we don't currently have a passing result for the value the customer
  // typed in. Drives the submit gate below and the inline hint on the
  // verify button.
  const isGamerspayVerified = (currentValue) => {
    if (playerIdInput?.verify_type !== "gamerspay") return true;
    const v = verifyState[playerIdInput.id];
    if (!v || !v.data || v.error) return false;
    return (
      String(v.value || "").trim() === String(currentValue || "").trim()
    );
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

  // Form Validation Schema — playerid is only required when a Player ID
  // dynamic input is configured (or the legacy isactivefortopup flag is set).
  // Likewise, `selectedpackage` is only required when the product actually
  // has packages to pick from — otherwise the form is in info-only mode and
  // the submit just records the dynamic input values.
  const requirePlayerId = !!playerIdInput;
  const validationFields = {
    playerid: requirePlayerId
      ? Yup.string().required("Player ID is required").trim()
      : Yup.string().trim(),
    selectedpackage: hasPackages
      ? Yup.object().nullable().required("Select a package")
      : Yup.object().nullable(),
    payment_mathod: hasPackages
      ? Yup.string().required().trim().label("Payment method")
      : Yup.string().trim().nullable(),
  };
  // Every non-PlayerID dynamic input is required so the admin-defined
  // Account Info section can't be submitted with blanks. PlayerID is
  // already covered above via the `requirePlayerId` rule.
  dynamicInputs.forEach((inp) => {
    if (inp.is_player_id) return;
    validationFields[`dyn_${inp.id}`] = Yup.string()
      .trim()
      .required(`${inp.title} is required`);
  });
  const validationSchema = Yup.object().shape(validationFields);

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
              <NoticePopup productId={product_id} />
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
                            <Button className="small topup-cta-gradient-btn ">
                              Login
                            </Button>
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
                              <Button className="small topup-cta-gradient-btn">
                                Add Money
                              </Button>
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

                      // GamersPay name-check is a hard gate. If the admin
                      // configured this product to validate against the
                      // GamersPay API and the customer hasn't passed it
                      // (or edited the ID after passing), bail out before
                      // we hit /packageorder. Inline error tells them to
                      // press "Check Player ID".
                      if (playerIdInput?.verify_type === "gamerspay") {
                        if (!isGamerspayVerified(playerid)) {
                          const stale =
                            verifyState[playerIdInput.id]?.data &&
                            String(
                              verifyState[playerIdInput.id]?.value || "",
                            ).trim() !== String(playerid || "").trim();
                          setServerError(
                            stale
                              ? `Please re-check ${playerIdInput.title} — it changed after the last verification.`
                              : `Please verify ${playerIdInput.title} first — this product requires a successful GamersPay name check before ordering.`,
                          );
                          scrollTopWindow();
                          return;
                        }
                      }

                      // Quantity gate: either the product-level master
                      // switch OR the per-package switch is enough. Mirrors
                      // the render path + the submit payload below so the
                      // modal can't disagree with what the user saw.
                      const confirmQuantity =
                        selectedpackage &&
                        (productInfo?.allow_quantity == 1 ||
                          selectedpackage?.allow_quantity == 1)
                          ? Math.max(1, Number(values.quantity) || 1)
                          : 1;
                      const confirmTotal =
                        Number(selectedpackage?.price || 0) * confirmQuantity;
                      const confirmBreakdown =
                        confirmQuantity > 1
                          ? ` <span class="text-xs text-gray-500">(${confirmQuantity} × ৳${selectedpackage?.price})</span>`
                          : "";

                      // Info-only products (no packages) skip the Swal
                      // confirmation since there's no price to confirm.
                      const confirmHtml = selectedpackage
                        ? `<div class="_confirm_order_body">
                              <h4 class="_h4">Confirm Order</h4>
                              <p className="modal_sub_title">Your current wallet is <span class="_bold_it">৳${userWallet}</span></p>
                              <p className="modal_sub_title">You need <span class="_bold_it">৳${confirmTotal.toFixed(2)}</span>${confirmBreakdown} to purchase this product.</p>
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
                              // Quantity is honoured only when both the
                              // product (master switch) and the selected
                              // package have `allow_quantity` on. Other
                              // packages always submit 1. The server
                              // re-checks both flags as a safety net.
                              quantity:
                              ((productInfo?.allow_quantity == 1 &&
                                      values.selectedpackage) ||
                                     (values.selectedpackage && values.selectedpackage.allow_quantity ==
                                        1))
                                  ? Math.max(1, Number(values.quantity) || 1)
                                  : 1,
                            })
                            .then(async (order_res) => {
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
                                // When the voucher pool was empty the server
                                // keeps the order in "pending" with a
                                // restock-marker brief_note. Surface a
                                // Bengali notice so the user understands
                                // why their voucher isn't there yet and
                                // who to reach out to.
                                const brief = String(
                                  order_res.data?.data?.brief_note || "",
                                );
                                const awaitingRestock = /restock/i.test(brief);
                                if (awaitingRestock) {
                                  setFlashMessage(
                                    "আপনার অর্ডারটি গৃহীত হয়েছে — তবে এই মুহূর্তে ভাউচার স্টকে নেই। স্টক রিস্টক হওয়া মাত্রই ভাউচার ডেলিভারি দেওয়া হবে। যদি দীর্ঘ সময় লাগে অনুগ্রহ করে আমাদের সাপোর্টে যোগাযোগ করুন।",
                                  );
                                } else {
                                  setFlashMessage(
                                    "Your order has been placed successfully.",
                                  );
                                }
                                // Wallet was debited server-side for "pay"
                                // orders. Invalidate + refetch the cached
                                // user-profile so the navbar balance updates
                                // before we navigate away. The useEffect
                                // already wired up to userProfileData pushes
                                // the fresh value into globalContext.
                                try {
                                  await queryClient.invalidateQueries(
                                    "user-profile",
                                  );
                                  const fresh = await queryClient.fetchQuery(
                                    "user-profile",
                                    getUserProfile,
                                  );
                                  if (fresh) updateAuthUserInfo(fresh);
                                } catch (e) {
                                  /* navbar will refresh on next page load */
                                }
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

                      // Both flags must be on to honour the input:
                      // the product master switch (admin-set on the
                      // product form) AND the per-package switch.
                      // Anything else implicitly uses quantity 1.
                      const orderQuantity =
                      ((productInfo?.allow_quantity == 1 &&
                                      values.selectedpackage) ||
                                     (values.selectedpackage && values.selectedpackage.allow_quantity ==
                                        1))
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
                              const selectedPkg = values.selectedpackage;
                              const rewardType = String(
                                selectedPkg?.reward_type || "coin",
                              ).toLowerCase();
                              const selectedCoin =
                                rewardType === "money"
                                  ? 0
                                  : Number(selectedPkg?.coin_value || 0);
                              const selectedCashback =
                                rewardType === "money"
                                  ? Number(selectedPkg?.cashback_amount || 0)
                                  : 0;
                              const isReseller =
                                String(
                                  authUser?.user_type || "",
                                ).toLowerCase() === "reseller";
                              const selectedResellerCashback = isReseller
                                ? Number(selectedPkg?.reseller_cashback || 0)
                                : 0;
                              return (
                                <div
                                  className="_order_box_wrapper animate-fade-in-up"
                                  style={{ animationDelay: "80ms" }}
                                >
                                  <div className="_order_box_header justify-between flex-wrap">
                                    <div className="flex gap-3 items-center">
                                      <div className="_order_header_step_circle">
                                        {rechargeStep}
                                      </div>
                                      <h5 className="_order_header_title">
                                        Select Recharge
                                      </h5>
                                    </div>
                                    {/* Coin reward only surfaces here when a
                                    package is selected — pulled out of the
                                    cards so they stay clean. */}

                                    {values.selectedpackage &&
                                      Number(
                                        values.selectedpackage.stock_tracking,
                                      ) === 1 && (
                                        <div className="w-max inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[12px]">
                                          <span className="font-semibold">
                                            In stock:
                                          </span>
                                          <strong>
                                            {Number(
                                              values.selectedpackage
                                                .stock_quantity,
                                            ) || 0}
                                          </strong>
                                        </div>
                                      )}

                                    {selectedCoin > 0 && (
                                      <span className="topup-pack-header-coin">
                                        <GiTwoCoins /> +{selectedCoin} coins
                                      </span>
                                    )}
                                    {(selectedCashback > 0 ||
                                      selectedResellerCashback > 0) && (
                                        <div className="flex flex-col gap-2">
                                          {selectedCashback > 0 && (
                                            <span
                                              className="topup-pack-header-coin"
                                              style={{
                                                background: "#10b9811a",
                                                color: "#047857",
                                                borderColor: "#10b98166",
                                              }}
                                            >
                                              ৳ {selectedCashback.toFixed(2)}{" "}
                                              cashback
                                            </span>
                                          )}
                                          {selectedResellerCashback > 0 && (
                                            <span
                                              className="topup-pack-header-coin"
                                              style={{
                                                background: "#ec48991a",
                                                color: "#9d174d",
                                                borderColor: "#ec489966",
                                              }}
                                            >
                                              ৳{" "}
                                              {selectedResellerCashback.toFixed(
                                                2,
                                              )}{" "}
                                              reseller cashback
                                            </span>
                                          )}
                                        </div>
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
                                        // Out-of-stock when either the manual
                                        // "In Stock" flag is off, OR tracked
                                        // stock is enabled and the count has
                                        // reached 0.
                                        const trackedEmpty =
                                          Number(pack?.stock_tracking) === 1 &&
                                          Number(pack?.stock_quantity) <= 0;
                                        const outOfStock =
                                          parseInt(pack?.in_stock) === 0 ||
                                          trackedEmpty;
                                        // order_once modes:
                                        //   1 = once forever  / Player ID-scoped
                                        //   2 = once a day    / Player ID-scoped
                                        //   3 = once forever  / user-scoped
                                        //   4 = once a day    / user-scoped
                                        // Modes 1 & 2 need a Player ID input
                                        // on the product to be meaningful (no
                                        // playerid → can't scope). Modes 3 &
                                        // 4 are scoped by user account and
                                        // apply regardless of input shape.
                                        // The backend's blocked-ids list
                                        // already encodes the right answer
                                        // per mode, so this gate is just to
                                        // avoid showing "claimed" on packs
                                        // whose mode is moot for this product.
                                        const reorderMode =
                                          Number(pack?.order_once) || 0;
                                        const isPlayerScopedMode =
                                          reorderMode === 1 ||
                                          reorderMode === 2;
                                        const isUserScopedMode =
                                          reorderMode === 3 ||
                                          reorderMode === 4;
                                        const isDailyMode =
                                          reorderMode === 2 ||
                                          reorderMode === 4;
                                        const alreadyOrdered =
                                          reorderMode > 0 &&
                                          ((isPlayerScopedMode &&
                                            !!playerIdInput) ||
                                            isUserScopedMode) &&
                                          orderedOnceIds.has(Number(pack?.id));
                                        const isDisabled =
                                          outOfStock || alreadyOrdered;
                                        const isSelected =
                                          parseInt(selectedPackage) === index;
                                        const packCoin = Number(
                                          pack?.coin_value || 0,
                                        );
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
                                                    {isDailyMode
                                                      ? "Try again tomorrow"
                                                      : "Already claimed"}
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
                                          </div>
                                        );
                                      })}
                                      {/* Single Recharge --End-- */}
                                    </div>

                                    {/* Description button — only when the selected package has a description */}
                                    {values.selectedpackage?.description && (
                                      <button
                                        type="button"
                                        className="topup-pack-desc-btn mt-3"
                                        onClick={() =>
                                          setDescPack(values.selectedpackage)
                                        }
                                      >
                                        <FaInfo className="topup-pack-desc-btn-icon" />
                                        View Description
                                      </button>
                                    )}

                                    {/* Selected package's tracked stock —
                                        only renders when the admin opted into
                                        quantity tracking for the package so
                                        non-tracked packages stay unchanged. */}

                                    {/* Quantity stepper — both the product
                                        master switch AND the per-package
                                        switch must be on. The label is
                                        re-skinned per product via
                                        `quantity_prefix` (e.g. "Dollars");
                                        blank ⇒ default "Quantity". */}
                                    {((productInfo?.allow_quantity == 1 &&
                                      values.selectedpackage) ||
                                     (values.selectedpackage && values.selectedpackage.allow_quantity ==
                                        1)) && (
                                        <div className="topup-quantity-row mt-4 flex items-center gap-3 flex-wrap">
                                          <label className="text-sm font-semibold text-gray-700">
                                            {String(
                                              productInfo?.quantity_prefix || "",
                                            ).trim() || "Quantity"}
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
                                              <a className="_link topup-cta-gradient-btn">
                                                Add Money
                                              </a>
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
                                            required
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
                                                  ? "Checking..."
                                                  : `Check ${inp.title}`}
                                              </button>
                                              {vState.error && (
                                                <span className="text-xs text-red-600">
                                                  {vState.error}
                                                </span>
                                              )}
                                              {vState.data &&
                                                !vState.error &&
                                                (() => {
                                                  // GamersPay returns
                                                  // { success, player_name }
                                                  // while the dynamic flow
                                                  // returns { player_info:
                                                  // { nickname, level } }
                                                  // or a flat { nickname,
                                                  // level }. Prefer
                                                  // player_name when
                                                  // present, fall back to
                                                  // nickname so both shapes
                                                  // render the same.
                                                  const info =
                                                    vState.data.player_info ||
                                                    vState.data;
                                                  const playerName =
                                                    vState.data.player_name ||
                                                    info?.player_name ||
                                                    info?.nickname;
                                                  const level = info?.level;
                                                  if (
                                                    !playerName &&
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
                                                      {playerName && (
                                                        <span className="topup-verify-chip">
                                                          <span className="topup-verify-chip-label">
                                                            Name
                                                          </span>
                                                          <strong>
                                                            {playerName}
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
                                      src={walletPayImage}
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
                                      {orderQuantity > 1 && (
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
                                    <Button
                                      type="button"
                                      className="outlined topup-cta-gradient-btn"
                                    >
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
                                    selectedPaymentMethod != "auto_payment") ||
                                  // GamersPay gate — same rule as the
                                  // onSubmit guard above so the button
                                  // visually reflects what'll happen on
                                  // click.
                                  (playerIdInput?.verify_type ===
                                    "gamerspay" &&
                                    !isGamerspayVerified(values.playerid))
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
                                <div className="_body2 text-[13px] rich-text-html">
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
