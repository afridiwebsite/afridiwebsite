import { Autoplay, Pagination } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { BrowserView, MobileView } from 'react-device-detect';
import { FaTelegramPlane } from 'react-icons/fa';
import api from '../api/api';
import ActivityIndicator from '../components/ActivityIndicator';
import Game from '../components/game';
import { hasData, imgPath } from '../helpers/helpers';

function SectionTitle({ children }) {
  return (
    <h3 className="section-heading">
      <span>{children}</span>
      <span className="fire" aria-hidden="true">🔥</span>
    </h3>
  );
}

function CategorySection({ title, products }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="container mt-3 mb-3 animate-fade-in">
      <div className="section-card">
        <SectionTitle>{title}</SectionTitle>
        <div className="grid grid-cols-3 xs:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
          {products.map((p, i) => (
            <div
              key={p.id || i}
              style={{ animationDelay: `${i * 30}ms` }}
              className="animate-fade-in-up"
            >
              <Game game={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OrderRow({ order }) {
  const status = String(order.status || '').toLowerCase();
  const initial = (order.name || '?').slice(0, 1).toUpperCase();
  return (
    <div className="order-row-card animate-fade-in-up">
      <div className="order-row-avatar">
        {order.logo ? (
          <img src={imgPath(order.logo)} alt={order.name} />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-gray-800 truncate">{order.name}</div>
        <div className="text-xs text-gray-500 truncate">
          ID: {order.playerid} · #{order.id} · {order.diff_in_seconds}s ago
        </div>
      </div>
      <span className={`status-pill ${status}`}>{status || 'unknown'}</span>
    </div>
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

  return (
    <>
      {hasData(header_notice) && (
        <section className="mb-2 md:my-3 home_slider_wrapper">
          <div className="container">
            <div className="header_notice_home">
              <strong className="header_notice_strong">Notice:</strong>
              <br />
              <p className="header_notice_p">{header_notice.notice}</p>
            </div>
          </div>
        </section>
      )}

      {hasData(banners) && (
        <section className="my-3 home_slider_wrapper">
          <div className="container">
            <Swiper
              autoplay={{ delay: 3000 }}
              loop={true}
              modules={[Pagination, Autoplay]}
              pagination={{ clickable: true }}
              slidesPerView={1}
              className="home-banner shadow-md"
            >
              {banners.map((banner, index) => (
                <span key={index}>
                  {banner.note == 'mobile' && (
                    <MobileView>
                      <SwiperSlide>
                        <a href={banner.link} target="_blank" rel="noreferrer">
                          <img
                            src={imgPath(banner.banner)}
                            alt={banner.note}
                            className="w-full h-auto object-cover"
                          />
                        </a>
                      </SwiperSlide>
                    </MobileView>
                  ) || (
                    <BrowserView>
                      <SwiperSlide>
                        <a href={banner.link} target="_blank" rel="noreferrer">
                          <img
                            src={imgPath(banner.banner)}
                            alt={banner.note}
                            className="w-full h-auto object-cover"
                          />
                        </a>
                      </SwiperSlide>
                    </BrowserView>
                  )}
                </span>
              ))}
            </Swiper>
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
          />
        ))}

      {looseProducts.length > 0 && (
        <CategorySection title="More Products" products={looseProducts} />
      )}

      {!hasCategories && looseProducts.length === 0 && (
        <CategorySection
          title="BD Game Shop"
          products={topup_products || []}
        />
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
        <section className="container my-4">
          <div className="section-card">
            <SectionTitle>Latest Orders</SectionTitle>
            <div className="flex flex-col gap-2">
              {product_order.slice(0, 12).map((po, i) => (
                <div key={po.id} style={{ animationDelay: `${i * 25}ms` }}>
                  <OrderRow order={po} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
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
    const res = await api.get('/topup-products-with-categories');
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
      const res2 = await api.get('/topupproduct');
      topup_products = res2?.data?.data || [];
      
      console.log(topup_products)
    } catch (e) {
      topup_products = topup_products || [];
    }
  }

  try {
    const bannerRes = await api.get('/banner');
    banners = bannerRes?.data?.data;
  } catch (error) {
    banners = null;
  }

  try {
    const headerNotice = await api.get('/notice-header');
    header_notice = headerNotice?.data?.data;
  } catch (error) {
    header_notice = null;
  }

  try {
    const res = await api.get('/product-orders');
    product_order = res?.data?.data;
  } catch (error) {
    product_order = null;
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
