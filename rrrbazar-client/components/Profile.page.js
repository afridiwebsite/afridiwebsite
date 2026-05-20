/*
 *
 * Title: Profile.page
 * Description: User profile — top-level stats only. The coin / daily-bonus /
 * convert / spin flow lives on the dedicated /spin page now.
 *
 */
import { useContext, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/router';
import {
  FaIdBadge,
  FaWallet,
  FaShoppingCart,
  FaClipboardList,
  FaCoins,
  FaSignOutAlt,
} from 'react-icons/fa';
import { GiTwoCoins, GiCoins } from 'react-icons/gi';
import { HiSparkles } from 'react-icons/hi';
import { getMyCoins, getUserOrders, getUserProfile } from '../api/api';
import reactQueryConfig from '../config/reactQueryConfig';
import Avatar from './Avatar';
import OnlyIconActivityIndicator from './OnlyIconActivityIndicator';
import { globalContext } from '/pages/_app';
import routes from '../config/routes';

const randomNumber = Math.floor(Math.random() * (6 - 1) + 1);

function ProfilePage() {
  const router = useRouter();
  const { authUser, updateAuthUserInfo, signOut } = useContext(globalContext);
  const { avatar, username, email, wallet } = authUser;

  // Refresh server-side user profile on visit (keeps wallet/coins in sync).
  const { data } = useQuery('user-profile', getUserProfile, reactQueryConfig);
  useEffect(() => {
    if (data) updateAuthUserInfo(data);
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
      return { totalSpent: sum, totalOrder: orders.length };
    },
  });

  // Just the coin BALANCE — no claim/convert/history here anymore.
  const [coins, setCoins] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMyCoins();
        if (!cancelled) setCoins(res?.data?.data?.coins || 0);
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="mb-7">
      {/* Hero banner */}
      <div className="relative md:container animate-fade-in h-[200px] md:h-[140px] md:mt-2">
        <div
          className="profile-hero md:rounded-lg h-full"
          style={{
            backgroundImage: `
              linear-gradient(0deg, rgba(0,0,0,0.65), rgba(0,0,0,0.15)),
              url(/profile-banners/${randomNumber}.jpg)
            `,
          }}
        />

        {/* Logout — top right of the hero. Pinned absolute so it doesn't
            shift the avatar / username layout below. */}
        <button
          type="button"
          onClick={signOut}
          className="absolute top-3 right-3 md:top-4 md:right-6 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow-md transition active:scale-95"
        >
          <FaSignOutAlt size={14} />
          <span>Logout</span>
        </button>

        <div className="flex flex-col sm:flex-row justify-center items-center md:items-end md:justify-between pb-5 absolute md:left-10 md:-bottom-3 left-0 right-0 m-auto top-1">
          <div className="flex flex-col items-center md:flex-row md:items-end gap-4 md:gap-5 mb-6 md:mb-0 animate-fade-in-up">
            <div className="rounded-full p-1 md:-mb-8 bg-white inline-block shadow-xl ring-2 ring-white/40">
              <Avatar
                size={120}
                src={avatar || null}
                text={username[0]}
                className="bg-gray-300"
              />
            </div>

            <div className="text-center md:text-left">
              <h4 className="_h4 text-white drop-shadow">{username}</h4>
              <p className="text-white/85 _subtitle2">{email}</p>
              {/* <button
                onClick={() => router.push(routes.settings.name)}
                className="profile-hero-btn"
              >
                Settings
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {/* Stats — five cards in a 5-col grid on lg, wrapping on smaller. */}
      <div className="container mt-14">
        <div className="grid grid-cols-1 xxs:grid-cols-2 lg:!grid-cols-5 gap-5 md:gap-7">
          {[
            { label: 'User Id',     value: authUser?.id,           delay: 60,  icon: <FaIdBadge /> },
            { label: 'Total Wallet', value: `৳ ${wallet || 0}`,    delay: 120, icon: <FaWallet />, path: routes.addMoney.name },
            { label: 'Total Coins', value: coins,                  delay: 180, icon: <FaCoins />,  path: routes.spin.name, accent: 'coin' },
            {
              label: 'Total Spent',
              value: (
                <>
                  <OnlyIconActivityIndicator
                    data={ordersData?.totalSpent}
                    loading={isLoading}
                    error={isError && error}
                  />
                  {ordersData?.totalSpent !== undefined && '৳ ' + ordersData?.totalSpent}
                </>
              ),
              delay: 240,
              icon: <FaShoppingCart />,
              path: routes.myOrder.name,
            },
            {
              label: 'Total Order',
              value: (
                <>
                  <OnlyIconActivityIndicator
                    data={ordersData?.totalOrder}
                    loading={isLoading}
                    error={isError && error}
                  />
                  {ordersData?.totalOrder}
                </>
              ),
              delay: 300,
              icon: <FaClipboardList />,
              path: routes.myOrder.name,
            },
          ].map((stat) => {
            const isCoin = stat.accent === 'coin';
            return (
              <div
                key={stat.label}
                className={`profile-stat-card animate-fade-in-up ${stat.path ? 'cursor-pointer' : ''} ${isCoin ? 'profile-stat-card-coin' : ''}`}
                style={{ animationDelay: `${stat.delay}ms` }}
                onClick={() => stat.path && router.push(stat.path)}
              >
                {/* Floating coin / sparkle layer — only on the coin card. */}
                {isCoin && (
                  <div className="profile-stat-stage" aria-hidden="true">
                    <span className="profile-stat-coin profile-stat-coin--1">
                      <FaCoins />
                    </span>
                    <span className="profile-stat-coin profile-stat-coin--2">
                      <GiTwoCoins />
                    </span>
                    <span className="profile-stat-coin profile-stat-coin--3">
                      <GiCoins />
                    </span>
                    <span className="profile-stat-sparkle profile-stat-sparkle--a">
                      <HiSparkles />
                    </span>
                    <span className="profile-stat-sparkle profile-stat-sparkle--b">
                      <HiSparkles />
                    </span>
                  </div>
                )}
                <div className="profile-stat-shine" aria-hidden="true" />
                <div className="relative flex flex-col items-center gap-3 py-6">
                  <div className={`profile-stat-icon ${isCoin ? 'is-coin' : ''}`}>
                    {stat.icon}
                  </div>
                  <p className="profile-stat-value !text-2xl !mb-1">{stat.value}</p>
                  <p className="profile-stat-label !text-sm">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
