/*
 *
 * Title: Profile.page
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useContext, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/router';
import { getUserOrders, getUserProfile } from '../api/api';
import reactQueryConfig from '../config/reactQueryConfig';
import Avatar from './Avatar';
import OnlyIconActivityIndicator from './OnlyIconActivityIndicator';
import { globalContext } from '/pages/_app';
import routes from '../config/routes';

const randomNumber = Math.floor(Math.random() * (6 - 1) + 1);

function ProfilePage() {
  const router = useRouter();
  const { authUser, updateAuthUserInfo } = useContext(globalContext);
  const { avatar, username, email, wallet } = authUser;

  // Updating User Data On Every Time user visit profile page
  const { data } = useQuery('user-profile', getUserProfile, reactQueryConfig);
  useEffect(() => {
    if (data) {
      updateAuthUserInfo(data);
    }
  }, [data, updateAuthUserInfo]);

  const {
    data: ordersData,
    isLoading,
    isError,
    error,
  } = useQuery('get-user-orders', getUserOrders, {
    ...reactQueryConfig,
    select: (res) => {
      let sum = 0;
      const orders = res.data.data;
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].status === 'completed') {
          sum += parseFloat(orders[i].amount);
        }
      }
      return {
        totalSpent: sum,
        totalOrder: orders.length,
      };
    },
  });

  return (
    <>
      <section className="mb-7">
        <div
          className="md:container"
          style={{
            backgroundImage: `
            linear-gradient(0deg, black, transparent),
            url(/profile-banners/${randomNumber}.jpg)
          `,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="flex flex-col md:flex-row justify-center items-center md:items-end md:justify-between pt-20 pb-5">
            {/* User Avatar & Info --Start-- */}
            <div className="flex flex-col items-center sm:flex-row md:items-end gap-4 md:gap-5 mb-6 md:mb-0">
              <div className="rounded-full p-1 md:-mb-8 bg-white inline-block">
                <Avatar
                  size={120}
                  src={avatar || null}
                  text={username[0]}
                  className="bg-gray-300"
                />
              </div>

              <div className="text-center md:text-left">
                <h4 className="_h4 text-white">{username}</h4>
                <p className="text-white/80 _subtitle2">{email}</p>
                <button
                  onClick={() => {
                    router.push(routes.settings.name);
                  }}
                  className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
                >
                  Settings
                </button>
                {/* <p className="text-white/80 _subtitle2">+880175685469</p> */}
              </div>
            </div>
            {/* User Avatar & Info --End-- */}
          </div>
        </div>
        <div className="container md:!px-0 mt-5 md:mt-7">
          <div className="grid md:grid-cols-[auto,350px] gap-5">
            <div className="grid grid-cols-1 xxs:grid-cols-2 lg:!grid-cols-4 gap-5 md:gap-7">
              <div className="_profile_stats_wrapper">
                <div className="_profile_stats_box pl-0">
                  <p className="_profile_stats_title">{authUser?.id}</p>
                  <p className="_body2 font-semibold">User Id</p>
                </div>
              </div>
              <div className="_profile_stats_wrapper">
                <div className="_profile_stats_box pl-0">
                  <p className="_profile_stats_title">৳ {wallet}</p>
                  <p className="_body2 font-semibold">Total Wallet</p>
                </div>
              </div>
              <div className="_profile_stats_wrapper">
                <div className="_profile_stats_box">
                  <p className="_profile_stats_title">
                    <OnlyIconActivityIndicator
                      data={ordersData?.totalSpent}
                      loading={isLoading}
                      error={isError && error}
                    />
                    {ordersData?.totalSpent && '৳ ' + ordersData?.totalSpent}
                  </p>
                  <p className="_body2 font-semibold">Total Spent</p>
                </div>
              </div>
              <div className="_profile_stats_wrapper">
                <div className="_profile_stats_box">
                  <p className="_profile_stats_title">
                    <OnlyIconActivityIndicator
                      data={ordersData?.totalOrder}
                      loading={isLoading}
                      error={isError && error}
                    />
                    {ordersData?.totalOrder}
                  </p>
                  <p className="_body2 font-semibold">Total Order</p>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-md">
              <h6 className="_h6 py-2 px-4 border-b bg-gray-50 border-gray-200">
                User Info
              </h6>
              <div className="p-4">
                <p className="_subtitle1">
                  <span className="font-semibold">Phone:</span>{' '}
                  {authUser?.phone}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ProfilePage;
