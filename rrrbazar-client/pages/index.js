import { useState, useEffect } from "react";
import moment from "moment";
import ReactHtmlParser from "react-html-parser";
import { Autoplay, Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { BrowserView, MobileView } from "react-device-detect";
import { FaTelegramPlane, FaTimes } from "react-icons/fa";
import { IoCloseSharp } from "react-icons/io5";
import api from "../api/api";
import ActivityIndicator from "../components/ActivityIndicator";
import Game from "../components/game";
import MarqueeTicker from "../components/MarqueeTicker";
import SEO from "../components/SEO";
import { hasData, imgPath } from "../helpers/helpers";

function SectionTitle({ children }) {
  return (
    <h3 className="home-section-title font-bold text-lg md:text-2xl !mb-2">
      {/* <span className="home-section-title-bar" aria-hidden="true" /> */}
      <span>{children}</span>
      {/* <span className="home-section-title-bar" aria-hidden="true" /> */}
    </h3>
  );
}

function CategorySection({ title, products, limit_product, product_limit }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!products || products.length === 0) return null;

  const shouldLimit =
    limit_product === 1 && product_limit > 0 && products.length > product_limit;
  const displayProducts =
    shouldLimit && !isExpanded ? products.slice(0, product_limit) : products;

  return (
    <section className="container mb-8 mt-8 animate-fade-in">
      <div className="">
        <SectionTitle>{title}</SectionTitle>
        <div className="grid grid-cols-3 xs:grid-cols-3 md:grid-cols-6 gap-2 md:gap-8">
          {displayProducts.map((p, i) => (
            <div
              key={p.id || i}
              style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
              className="animate-fade-in-up game-tile-anim"
            >
              <Game game={p} />
            </div>
          ))}
        </div>
        {shouldLimit && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-8 py-2.5 bg-gradient-to-br from-primary-500 to-secondary-500 hover:bg-primary-600 text-white rounded-full text-sm font-bold transition-all shadow-[0_4px_15px_rgba(0,65,194,0.25)] hover:shadow-[0_6px_20px_rgba(0,65,194,0.35)] active:scale-95 flex items-center gap-2"
            >
              <span>{isExpanded ? "Show Less" : "Show More"}</span>
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function formatOrderTime(value) {
  if (!value) return "";
  const m = moment(value);
  if (!m.isValid()) return String(value);
  const now = moment();
  if (m.isSame(now, "day")) return `Today, ${m.format("h:mm A")}`;
  if (m.isSame(now.clone().subtract(1, "day"), "day"))
    return `Yesterday, ${m.format("h:mm A")}`;
  const fmt = m.isSame(now, "year") ? "MMM D, h:mm A" : "MMM D, YYYY, h:mm A";
  return m.format(fmt);
}

function OrderRow({ order }) {
  // Slugify so multi-word statuses like "In Progress" → "in-progress" map to
  // a valid CSS class (spaces in className make the modifier unmatchable).
  const status = String(order.status || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-");
  // API now returns the order's User and TopupProduct as nested includes.
  const orderUser = order.User || order.user;
  const orderProduct = order.TopupProduct || order.product;
  const orderPackage = order.TopupPackage || order.package;
  const packLogo = orderPackage?.logo;
  const displayName =
    orderUser?.username ||
    (orderUser?.email ? orderUser.email.split("@")[0] : "Anonymous Player");
  const initial = (displayName?.[0] || "?").toUpperCase();
  const orderedAt = formatOrderTime(order.created_at);
  const completedAt =
    status === "completed"
      ? formatOrderTime(order.updated_at || order.completed_at)
      : "";
  return (
    <div className="topup-order-row animate-fade-in-up">
      <div className="topup-order-row-avatar">
        {orderUser?.avatar ? (
          <img
            src={orderUser.avatar}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.classList.add("is-fallback");
            }}
          />
        ) : null}
        <span className="topup-order-row-avatar-fallback">{initial}</span>
      </div>

      <div className="topup-order-row-main">
        <div className="topup-order-row-line">
          <span className="topup-order-row-user">{displayName}</span>
        </div>
        <div className="topup-order-row-meta">
          {packLogo && (
            <img
              className="topup-order-row-product-logo"
              src={imgPath(packLogo)}
              alt=""
            />
          )}
          <span className="topup-order-row-pack">
            {order.name}
            {/* Dollar/quantity input appended inline — shown whenever it
                differs from a single unit (incl. fractions like 0.5).
                `quantity` is DECIMAL out of the API (e.g. "50.00"); trim
                trailing zeros. */}
            {Number.isFinite(Number(order?.quantity)) &&
            Number(order?.quantity) !== 1
              ? ` ${parseFloat(Number(order.quantity).toFixed(2))}`
              : ""}
          </span>
          {order.amount != null && (
            <>
              <span className="topup-order-row-sep">-</span>
              <span className="topup-order-row-price">{order.amount}৳</span>
            </>
          )}
        </div>
        {orderedAt && (
          <div className="topup-order-row-stamp">Ordered: {orderedAt}</div>
        )}
      </div>

      <div className="topup-order-row-side">
        <span className={`topup-status-badge topup-status-badge--${status}`}>
          {order.status || "unknown"}
        </span>
        {/* {completedAt && (
          <div className="topup-order-row-stamp">Completed: {completedAt}</div>
        )} */}
      </div>
    </div>
  );
}

// Small subtitle under "Latest Orders" — re-renders every minute so the
// "X ago" stays fresh without a refetch.
function LatestOrdersUpdated({ orders }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const latest = (orders || []).reduce((acc, o) => {
    const t = new Date(o.created_at).getTime();
    return !isFinite(t) ? acc : Math.max(acc, t);
  }, 0);
  if (!latest) return null;
  return (
    <p className="latest-orders-updated">
      Last updated <span>{moment(latest).fromNow()}</span>
    </p>
  );
}

function Home({
  topup_products,
  products_by_category,
  uncategorized,
  banners,
  header_notice,
  product_order,
}) {
  const hasCategories =
    Array.isArray(products_by_category) && products_by_category.length > 0;
  const looseProducts = Array.isArray(uncategorized) ? uncategorized : [];

  const [closedNoticeIds, setClosedNoticeIds] = useState([]);

  useEffect(() => {
    const closed = JSON.parse(localStorage.getItem("closed_notices") || "[]");
    setClosedNoticeIds(closed);
  }, []);

  useEffect(() => {
    const savedPosition = localStorage.getItem("home_scroll_pos");
    if (savedPosition) {
      // Small delay to ensure the content is fully rendered before scrolling
      const timer = setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedPosition, 10),
          behavior: "instant",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    let timeoutId;
    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.setItem("home_scroll_pos", window.scrollY.toString());
      }, 250);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleCloseNotice = (ids) => {
    const idArray = Array.isArray(ids) ? ids : [ids];
    setClosedNoticeIds((prev) => {
      const updated = [...new Set([...prev, ...idArray])];
      localStorage.setItem("closed_notices", JSON.stringify(updated));
      return updated;
    });
  };

  const renderNotice = () => {
    if (!Array.isArray(header_notice) || header_notice.length === 0)
      return null;

    const visibleNotices = header_notice.filter(
      (n) => !closedNoticeIds.includes(n.id),
    );
    if (visibleNotices.length === 0) return null;

    const marquees = visibleNotices.filter((n) => n.type === "marquee");
    const others = visibleNotices.filter((n) => n.type !== "marquee");

    return (
      <>
        {marquees.length > 0 && (
          <section className="mb-2 mt-1 md:my-3 home_slider_wrapper animate-fade-in">
            <div className="container">
              <div className="home-notice home-notice--marquee">
                <div className="home-notice-header">
                  <span className="home-notice-dot" aria-hidden="true" />
                  <span className="home-notice-label">NOTICE</span>
                </div>
                <MarqueeTicker items={marquees} />
                {/* <button
                  onClick={() => handleCloseNotice(marquees.map((m) => m.id))}
                  className="home-notice-close"
                  aria-label="Close marquee"
                >
                  <FaTimes size={14} />
                </button> */}
              </div>
            </div>
          </section>
        )}
        {others.map((n) => (
          <section
            key={n.id}
            className="mb-2 md:my-3 home_slider_wrapper animate-fade-in"
          >
            <div className="container">
              <div className="navbar-notice">
                <div className="navbar-notice-body">
                  <div className="navbar-notice-title">Notice</div>
                  <div className="navbar-notice-text">
                    {ReactHtmlParser(String(n.notice || ""))}
                  </div>
                </div>
                <button
                  onClick={() => handleCloseNotice(n.id)}
                  className="navbar-notice-close"
                  aria-label="Close notice"
                  type="button"
                >
                  <IoCloseSharp size={18} />
                </button>
              </div>
            </div>
          </section>
        ))}
      </>
    );
  };

  return (
    <div className="mb-20">
      <SEO
        canonicalPath="/"
        description="Bangladesh’s #1 game top-up shop. Instantly buy Free Fire diamonds, PUBG Mobile UC, Mobile Legends diamonds, gift cards and game credits with bKash, Nagad & Rocket. Fast delivery across Bangladesh — Dhaka, Chattogram, Sylhet & more."
      />
      {renderNotice()}

      {hasData(banners) && (
        <section className="my-3 home_slider_wrapper">
          <div className="container">
            <div className="home-banner-wrap">
              <Swiper
                autoplay={{ delay: 3000 }}
                loop={true}
                modules={[Pagination, Autoplay]}
                pagination={{
                  el: ".home-banner-dots",
                  clickable: true,
                  bulletClass: "home-banner-dot",
                  bulletActiveClass: "is-active",
                }}
                slidesPerView={1}
                className="home-banner shadow-md aspect-[520/240] "
              >
                {banners.map((banner, index) => (
                  <SwiperSlide key={index}>
                    <div
                      className={
                        banner.note === "mobile"
                          ? "md:hidden"
                          : "hidden md:block"
                      }
                    >
                      <a href={banner.link} target="_blank" rel="noreferrer">
                        <img
                          src={imgPath(banner.banner)}
                          alt={banner.note}
                          className="w-full h-auto object-cover"
                        />
                      </a>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className="home-banner-dots" />
            </div>
          </div>
        </section>
      )}

      <ActivityIndicator
        data={topup_products || products_by_category}
        error={!topup_products && !products_by_category}
      />

      {hasCategories &&
        products_by_category.map((cat) => (
          <CategorySection
            key={cat.id}
            title={cat.name}
            products={cat.products}
            limit_product={cat.limit_product}
            product_limit={cat.product_limit}
          />
        ))}

      {looseProducts.length > 0 && (
        <CategorySection title="More Products" products={looseProducts} />
      )}

      {!hasCategories && looseProducts.length === 0 && (
        <CategorySection title="BD Game Shop" products={topup_products || []} />
      )}

      {/* Join Telegram CTA */}
      {/* <section className="container my-4">
        <a
          href="https://t.me/"
          target="_blank"
          rel="noreferrer"
          className="cta-strip"
        >
          <FaTelegramPlane size={22} />
          <span>Join Telegram</span>
        </a>
      </section> */}

      {/* Latest Orders */}
      {product_order && product_order.length > 0 && (
        <section className="container my-4 animate-fade-in mt-20">
          <div className="section-card home-section-card">
            <SectionTitle>Latest Orders</SectionTitle>

            <div
              className="order-design pointer-events-none mx-auto mt-2 mb-8 flex max-w-md items-center justify-center gap-2 px-4"
              aria-hidden="true"
            >
              <span className="h-px min-w-[2.5rem] flex-1 rounded-full bg-gradient-to-r from-transparent via-secondary-400/50 to-secondary-500/70"></span>
              <span className="relative shrink-0">
                <span className="absolute inset-0 scale-150 rounded-full bg-primary-500/20 blur-md"></span>
                <span className="relative block h-1.5 w-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 shadow-[0_2px_14px_rgba(0,65,194,0.35)]"></span>
              </span>
              <span className="h-px min-w-[2.5rem] flex-1 rounded-full bg-gradient-to-l from-transparent via-primary-400/50 to-primary-500/70"></span>
            </div>

            <LatestOrdersUpdated orders={product_order} />

            <ul className="topup-orders-list">
              {product_order.slice(0, 12).map((po, i) => (
                <li
                  key={po.id}
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                >
                  <OrderRow order={po} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;

export async function getServerSideProps(ctx) {
  let topup_products = null;
  let products_by_category = null;
  let uncategorized = null;
  let banners = null;
  let header_notice = null;
  let product_order = null;

  try {
    const res = await api.get("/topup-products-with-categories");
    products_by_category = res?.data?.data?.categories || [];
    uncategorized = res?.data?.data?.uncategorized || [];
    topup_products = res?.data?.data?.products || [];
  } catch (error) {
    products_by_category = null;
    uncategorized = null;
  }

  // If the categorized endpoint succeeded but returned no products, OR if it
  // failed, try the legacy flat list so the home page still has something to
  // show.
  if (!topup_products || topup_products.length === 0) {
    try {
      const res2 = await api.get("/topupproduct");
      topup_products = res2?.data?.data || [];
    } catch (e) {
      topup_products = topup_products || [];
    }
  }

  try {
    const bannerRes = await api.get("/banner");
    banners = bannerRes?.data?.data;
  } catch (error) {
    banners = null;
  }

  try {
    const headerNotice = await api.get("/notice-header");
    header_notice = headerNotice?.data?.data;
  } catch (error) {
    header_notice = null;
  }

  try {
    const res = await api.get("/product-orders");
    // The page only renders the latest 12 rows, and OrderRow only reads a
    // handful of fields. Slicing + projecting to a lean shape here keeps the
    // serialized props small (the raw list with nested User/Product/Package
    // rows was the bulk of the >130 kB page-data payload).
    // Coerce every field to null when missing — getServerSideProps can't
    // serialize `undefined`.
    product_order = (res?.data?.data || []).slice(0, 12).map((o) => {
      const u = o.User || o.user;
      const pkg = o.TopupPackage || o.package;
      return {
        id: o.id ?? null,
        name: o.name ?? null,
        amount: o.amount ?? null,
        quantity: o.quantity ?? null,
        status: o.status ?? null,
        created_at: o.created_at ?? null,
        updated_at: o.updated_at ?? null,
        completed_at: o.completed_at ?? null,
        User: u
          ? {
              username: u.username ?? null,
              email: u.email ?? null,
              avatar: u.avatar ?? null,
            }
          : null,
        TopupPackage: pkg ? { logo: pkg.logo ?? null } : null,
      };
    });
  } catch (error) {
    product_order = null;
  }

  // The flat product list is only a fallback for when there are no categories.
  // When categories are present it duplicates every product already in the
  // categorized tree, so drop it from the payload.
  if (Array.isArray(products_by_category) && products_by_category.length > 0) {
    topup_products = null;
  }

  return {
    props: {
      topup_products,
      products_by_category,
      uncategorized,
      banners,
      header_notice,
      product_order,
    },
  };
}
