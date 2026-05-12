import Head from 'next/head';
import { Fragment } from 'react';
import { useInfiniteQuery } from 'react-query';
import { getMyShopLists } from '../../api/api';
import ActivityIndicator from '../../components/ActivityIndicator';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import FlashMessage from '../../components/FlashMessage';
import { __page_title_end } from '../../config/globalConfig';
import reactQueryConfig from '../../config/reactQueryConfig';
import { hasData, imgPath } from '../../helpers/helpers';

function MyShopPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
  } = useInfiniteQuery('get-my-shop-lists', getMyShopLists, {
    ...reactQueryConfig,
    select: (res) => res.pages,
    getNextPageParam: (lastPage) => {
      return lastPage?.data?.data?.nextPage || undefined;
    },
  });

  const _hasData = data?.[0]?.data?.data?.data;

  return (
    <>
      <Head>
        <title>My Shop {__page_title_end}</title>
      </Head>
      <section>
        <FlashMessage showToast />
        <div className="container my-7">
          <h1 className="_section_title">My Shop List</h1>
          <div className="space-y-5">
            {data?.map((lists, index) => (
              <Fragment key={index}>
                {hasData(lists.data.data.data) &&
                  lists.data.data.data?.map((list, index) => (
                    <div
                      key={list?.id || index}
                      className="border border-gray-200 p-3 md:p-4 rounded-md overflow-hidden flex flex-wrap justify-between space-y-4 md:space-y-0"
                    >
                      <div className="flex md:space-x-3 flex-wrap">
                        <div className="max-w-full md:max-w-[120px] flex-shrink-0">
                          <img
                            className="max-w-[70%] mx-auto md:max-w-full"
                            src={imgPath(list?.Product?.image)}
                            alt={list?.Product?.name}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <p className="_subtitle1">
                            <span className="font-semibold mr-1.5">
                              Order Id:
                            </span>{' '}
                            {list?.id}
                          </p>
                          <p className="_subtitle1">
                            <span className="font-semibold mr-1.5">Date:</span>{' '}
                            {list?.created_at}
                          </p>
                          <p className="_subtitle1">
                            <span className="font-semibold mr-1.5">Price:</span>{' '}
                            {list?.amount}
                          </p>
                          <p className="_subtitle1">
                            <span className="font-semibold mr-1.5">
                              Product Name:
                            </span>{' '}
                            {list?.Product?.name}
                          </p>
                          {list?.admin_message && (
                            <Alert
                              type="error"
                              title={
                                <span>
                                  <strong>Note:</strong> {list.admin_message}
                                </span>
                              }
                              className="block w-full !mt-2.5"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge type={list.status} />
                      </div>
                    </div>
                  ))}
              </Fragment>
            ))}
          </div>
          {/* Load More */}
          {hasData(_hasData) && hasNextPage && (
            <div className="flex justify-center mt-5">
              <Button
                text="Load More"
                loading={isFetching || isFetchingNextPage}
                disabled={!hasNextPage}
                onClick={fetchNextPage}
              />
            </div>
          )}
          <ActivityIndicator
            data={_hasData}
            loading={isLoading}
            error={isError ? error : false}
          />
        </div>
      </section>
    </>
  );
}

export default MyShopPage;
