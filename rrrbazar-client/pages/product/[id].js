import Link from "next/link";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import ReactHtmlParser from "react-html-parser";
import { useQuery } from "react-query";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api, { getUserProfile } from "../../api/api";
import ActivityIndicator from "../../components/ActivityIndicator";
import Alert from "../../components/Alert";
import Button from "../../components/Button";
import SEO from "../../components/SEO";
import { SITE_URL } from "../../config/seoConfig";
import reactQueryConfig from "../../config/reactQueryConfig";
import routes from "../../config/routes";
import toastifyConfig from "../../config/toastifyConfig";
import {
  addRedirectQuery,
  getErrors,
  hasData,
  imgPath,
  scrollTopWindow,
  setFlashMessage,
} from "../../helpers/helpers";
import { globalContext } from "../_app";

function SingleProductPage({ product }) {
  const router = useRouter();
  const { authUser, updateAuthUserInfo, isAuth } = useContext(globalContext);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(false);
  const hasEnoughMoney = authUser?.wallet > product?.sale_price;
  const userWallet = authUser?.wallet;

  const { data } = useQuery("user-profile", getUserProfile, {
    ...reactQueryConfig,
    enabled: !!isAuth,
  });
  useEffect(() => {
    if (data) {
      updateAuthUserInfo(data);
    }
  }, [data, updateAuthUserInfo]);

  const confirmProductOrder = () => {
    let isConfirmed = false;

    console.log(isConfirmed, "dsas");
    Swal.fire({
      title: false,
      html: `
            <div class="_confirm_order_body">
              <h4 class="_h4">Confirm Order</h4>
              <p className="modal_sub_title">Your current wallet is <span class="_bold_it">৳${userWallet}</span></p>
              <p className="modal_sub_title">You need <span class="_bold_it">৳${product?.sale_price}</span> to purchase this product.</p>
            </div>`,
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
        setServerError(null);
        api
          .post("/product-order", {
            product_id: product.id,
          })
          .then(() => {
            // toast.success(
            //   'Your order has been placed successfully.',
            //   toastifyConfig
            // );
            setFlashMessage("Your order has been placed successfully.");
            router.push(`${routes.myShop.name}`);
          })
          .catch((err) => {
            const error = getErrors(err);
            setServerError(error);
            scrollTopWindow();
          })
          .finally(() => {
            setSubmitting(false);
          });
      } else {
        isConfirmed = false;
      }
    });
  };
  // Plain-text, length-capped description for the meta/OG tags.
  const metaDescription = product?.description
    ? String(product.description)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160)
    : `Buy ${product?.name || "game top-up"} instantly in Bangladesh with bKash, Nagad & Rocket on RRR-Bazar. Fast, secure delivery.`;

  const productImage = product?.image ? imgPath(product.image) : undefined;

  const productJsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: metaDescription,
        image: productImage,
        brand: { "@type": "Brand", name: "RRR-Bazar" },
        offers: {
          "@type": "Offer",
          price: product.sale_price,
          priceCurrency: "BDT",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/product/${product.id}`,
          areaServed: { "@type": "Country", name: "Bangladesh" },
        },
      }
    : undefined;

  return (
    <>
      <SEO
        title={product?.name}
        description={metaDescription}
        image={productImage}
        type="product"
        jsonLd={productJsonLd}
      />
      {serverError && (
        <div className="container py-5 border-b border-gray-200">
          <Alert type="error" title={serverError} />
        </div>
      )}
      <main
        className={`flex items-stretch flex-grow relative my-5 md:my-0 ${
          !product ? "justify-center" : ""
        } `}
      >
        <ActivityIndicator
          error={!product}
          errorMsg="Product not found"
          data={product}
        />
        {hasData(product) && (
          <div className="container grid gap-5 md:gap-0 md:border-r md:border-l border-gray-200 overflow-hidden _product_grid_wrapper">
            {/* grid-cols-1 md:grid-cols-[350px,auto,300px]  */}
            {/* Grid Left --Start-- */}
            <div className="flex flex-col justify-center md:pr-20 gap-3 _product_info border-gray-200">
              <h1 className="_h1 text-2xl md:text-4xl capitalize font-medium">
                {product?.name}
              </h1>
              {/* Short description */}
              {/* <p className="_subtitle1">
            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quibusdam
            nesciunt i
          </p> */}
              <div className="flex gap-3 items-end">
                <p className="_h4">৳ {product?.sale_price}</p>
                <p className="_subtitle2 line-through opacity-60">
                  ৳ {product?.regular_price}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!hasEnoughMoney && (
                  <Link href={routes.addMoney.name + addRedirectQuery(router)}>
                    <a>
                      <Button className="rounded-none outlined">
                        Add Money
                      </Button>
                    </a>
                  </Link>
                )}
                {hasEnoughMoney && (
                  <Button
                    className="rounded-none"
                    onClick={confirmProductOrder}
                    loading={submitting}
                  >
                    Buy Now
                  </Button>
                )}
              </div>
            </div>
            {/* Grid Left --End-- */}

            {/* Grid Center --Start-- */}
            <div className="md:border-r md:border-l md:max-w-[500px] _product_image">
              {/* <div className="flex flex-wrap flex-row md:flex-col gap-3 p-3 justify-center">
            <div className="border border-gray-200 md:h-[65px] h-[50px] md:w-[65px] md:[805x]">
              <img src="/game.jpg" className="w-full h-full object-cover" />
            </div>
            <div className="border border-gray-200 md:h-[65px] h-[50px] md:w-[65px] md:[805x]">
              <img src="/game.jpg" className="w-full h-full object-cover" />
            </div>
            <div className="border border-gray-200 md:h-[65px] h-[50px] md:w-[65px] md:[805x]">
              <img src="/game.jpg" className="w-full h-full object-cover" />
            </div>
            <div className="border border-gray-200 md:h-[65px] h-[50px] md:w-[65px] md:[805x]">
              <img src="/game.jpg" className="w-full h-full object-cover" />
            </div>
          </div> */}
              {/* Product Image --Start-- */}
              <div>
                <img
                  src={imgPath(product?.image)}
                  alt={product?.name || 'Product Image'}
                  className="w-full h-full object-cover mb-3"
                />
              </div>
              {/* Product Image --End-- */}
            </div>
            {/* Grid Center --End-- */}

            {/* Grid Right --Start-- */}
            <div className="flex flex-col justify-center gap-3 border-t-2 pt-5 md:pt-0 border-gray-200 md:border-t-0 md:mt-0 md:pl-5 _product_description">
              <p className="_subtitle1 font-semibold text-gray-800">
                Description:
              </p>
              <p className="_body2">{ReactHtmlParser(product?.description)}</p>
            </div>
            {/* Grid Right --End-- */}
          </div>
        )}
      </main>
    </>
  );
}

export default SingleProductPage;
{
  /* <div>
            <div className="relative max-h-[80vh]">
              <img src="/game.jpg" className="w-full" />
            </div>
          </div>
          <div>
            <div className="py-4">
              <h1 className="_h3">Lorem ipsum dolor sit amet.</h1>
            </div>
          </div> */
}

export async function getServerSideProps(ctx) {
  const productId = ctx?.query?.id;

  let product = null;

  // Fetching Single Product
  try {
    const res = await api.get(`/products/${productId}`);
    product = res?.data?.data;
  } catch (error) {
    product = null;
  }

  return {
    props: {
      product,
    },
  };
}
