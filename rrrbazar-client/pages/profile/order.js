import Head from 'next/head';
import { useQuery } from 'react-query';
import ReactHtmlParser from 'react-html-parser';
import { getUserOrders } from '../../api/api';
import ActivityIndicator from '../../components/ActivityIndicator';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import FlashMessage from '../../components/FlashMessage';
import { __page_title_end } from '../../config/globalConfig';
import reactQueryConfig from '../../config/reactQueryConfig';
import { hasData } from '../../helpers/helpers';

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
              orders.map((order, index) => (
                <div
                  style={{ background: '#ffffff'}}
                  key={order?.id || index}
                  className="border border-gray-200 p-3 md:p-4 rounded-md overflow-hidden flex justify-between"
                >
                  <div className="space-y-1.5">
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
                    {order?.brief_note && order?.brief_note.substring(0, 6) == 'UniPin' && (
                      <p className="_subtitle1">
                        <span className="font-semibold mr-1.5">
                          Voucher:
                        </span>{' '}
                        {order?.brief_note.substring(8)}
                      </p>
                    )}
                    {order?.brief_note && order?.brief_note.substring(0, 6) != 'UniPin' && (
                      <Alert
                        type="error"
                        title={
                          <span>
                            <strong>Note:</strong>{' '}
                            <span className="inline order-note-html">
                              {ReactHtmlParser(order.brief_note)}
                            </span>
                          </span>
                        }
                        className="block w-full !mt-2.5"
                      />
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {order?.brief_note && order?.brief_note.substring(0, 6) == 'UniPin' && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://shop.garena.my/app"
                        className="bg-primary-500 hover:bg-blue-700 block text-white font-bold py-2 px-4 rounded"
                      >
                        Reedem Code
                      </a>
                    )}
                    {order?.brief_note.substring(0, 6) != 'UniPin' && (
                      <Badge type={order.status} />
                    )}
                  </div>
                </div>
              ))}
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
