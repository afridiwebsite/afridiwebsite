import Head from 'next/head';
import { useQuery } from 'react-query';
import ReactHtmlParser from 'react-html-parser';
import { BiErrorCircle } from 'react-icons/bi';
import { FiCopy } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getUserOrders } from '../../api/api';
import ActivityIndicator from '../../components/ActivityIndicator';
import Badge from '../../components/Badge';
import FlashMessage from '../../components/FlashMessage';
import { __page_title_end } from '../../config/globalConfig';
import reactQueryConfig from '../../config/reactQueryConfig';
import { hasData } from '../../helpers/helpers';

// Pull vouchers off the order regardless of whether the API returned the
// hasMany shape (Vouchers: []) or the older hasOne shape (Voucher: {…}).
function vouchersOf(order) {
  if (Array.isArray(order?.Vouchers)) return order.Vouchers;
  if (Array.isArray(order?.vouchers)) return order.vouchers;
  if (order?.Voucher) return [order.Voucher];
  if (order?.voucher) return [order.voucher];
  return [];
}

function copy(value) {
  if (!value) return;
  try {
    navigator.clipboard.writeText(String(value));
    toast.info('Copied to clipboard');
  } catch (e) {
    /* clipboard may be unavailable on insecure origin */
  }
}

function OrderPage() {
  const {
    data: orders,
    isLoading,
    isError,
    error,
  } = useQuery('get-user-orders', getUserOrders, reactQueryConfig);

  return (
    <>
      <Head>
        <title>Orders {__page_title_end}</title>
      </Head>
      <section>
        <FlashMessage showToast />
        <div className="container my-7">
          <h1 className="_section_title">My Orders</h1>
          <div className="space-y-5">
            {hasData(orders) &&
              orders.map((order, index) => {
                const product =
                  order?.TopupProduct || order?.topup_product || null;
                // Only voucher-type products surface their voucher rows here.
                // Non-voucher orders may legitimately have rows in the
                // Vouchers join from older flows, but those shouldn't render
                // on the user-facing order list.
                const isVoucherProduct = product?.is_voucher == 1;
                const vouchers = isVoucherProduct ? vouchersOf(order) : [];
                const hasVouchers = vouchers.length > 0;
                const isCompleted = String(order?.status || '')
                  .toLowerCase()
                  .trim() === 'completed';
                const redeemLink = product?.redeem_link || '';
                const showRedeemBtn = isCompleted && !!redeemLink;
                const isUniPin =
                  order?.brief_note &&
                  order.brief_note.substring(0, 6) === 'UniPin';
                const hasFreeformNote =
                  order?.brief_note && !isUniPin && !hasVouchers;

                return (
                  <div
                    style={{ background: '#ffffff' }}
                    key={order?.id || index}
                    className="relative border border-gray-200 p-3 md:p-4 rounded-md overflow-hidden flex justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="_subtitle1">
                        <span className="font-semibold mr-1.5">Order Id:</span>{' '}
                        {order?.id}
                      </p>
                      <p className="_subtitle1">
                        <span className="font-semibold mr-1.5">Date:</span>{' '}
                        {order?.created_at}
                      </p>
                      <p className="_subtitle1">
                        <span className="font-semibold mr-1.5">Total Price:</span>{' '}
                        {order?.amount}
                      </p>
                      <p className="_subtitle1">
                        <span className="font-semibold mr-1.5">Player Id:</span>{' '}
                        {order?.playerid}
                      </p>
                      <p className="_subtitle1">
                        <span className="font-semibold mr-1.5">
                          Package Name:
                        </span>{' '}
                        {order?.name}
                      </p>

                      {hasVouchers && (
                        <div className="pt-2 mt-1 border-t border-gray-100">
                          <div className="flex items-center gap-2 mb-2 text-[13px]">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                              {vouchers.length}
                            </span>
                            <span className="font-semibold text-gray-700">
                              Voucher{vouchers.length > 1 ? 's' : ''}
                            </span>
                            {vouchers.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  copy(vouchers.map((v) => v.data).join('\n'))
                                }
                                className="ml-auto text-xs text-gray-500 hover:text-gray-800 underline"
                              >
                                Copy all
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {vouchers.map((v) => (
                              <div
                                key={v.id}
                                className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 max-w-full"
                              >
                                <span className="font-mono text-[13px] font-semibold text-emerald-800 break-all flex-1 min-w-0">
                                  {v.data}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copy(v.data)}
                                  className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition"
                                  aria-label="Copy voucher code"
                                  title="Copy code"
                                >
                                  <FiCopy size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isUniPin && (
                        <p className="_subtitle1">
                          <span className="font-semibold mr-1.5">Voucher:</span>{' '}
                          {order.brief_note.substring(8)}
                        </p>
                      )}

                      {hasFreeformNote && (
                        <div className="order-note">
                          <span className="order-note-icon" aria-hidden="true">
                            <BiErrorCircle />
                          </span>
                          <div className="order-note-body">
                            <div className="order-note-label">Note</div>
                            <div className="order-note-html">
                              {ReactHtmlParser(order.brief_note)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {isUniPin ? (
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href="https://shop.garena.my/app"
                          className="bg-primary-500 hover:bg-blue-700 block text-white font-bold py-2 px-4 rounded"
                        >
                          Reedem Code
                        </a>
                      ) : (
                        <Badge type={order.status} />
                      )}
                    </div>

                    {/* Redeem button — corner-pinned. Only renders for completed
                        voucher orders whose product has a redeem_link set. The
                        gradient mirrors `.header-search-btn` so primary CTAs
                        feel consistent across the storefront. */}
                    {showRedeemBtn && (
                      <a
                        href={redeemLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background:
                            'linear-gradient(135deg, var(--theme-primary, #2563eb) 0%, var(--theme-accent, #4D67D8) 100%)',
                          boxShadow:
                            '0 2px 8px rgba(var(--theme-primary-rgb, 37 99 235) / 0.35)',
                        }}
                        className="absolute bottom-3 right-3 hover:brightness-110 active:brightness-95 text-white font-bold py-1.5 px-4 rounded-full text-sm transition"
                      >
                        Redeem
                      </a>
                    )}
                  </div>
                );
              })}
          </div>
          <ActivityIndicator
            data={orders}
            loading={isLoading}
            error={isError ? error : false}
          />
        </div>
      </section>
    </>
  );
}

export default OrderPage;
