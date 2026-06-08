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
  FaPlusCircle,
  FaGift,
} from 'react-icons/fa';
import { GiTwoCoins, GiCoins } from 'react-icons/gi';
import { HiSparkles } from 'react-icons/hi';
import {
  getMyAddedTotal,
  getMyCoins,
  getMyVerification,
  getUserOrders,
  getUserProfile,
} from '../api/api';
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

      const nextStep = (verification?.steps || []).find(
                      (s) =>
                        verification?.submissions?.[String(s.step)]?.status !==
                        'verified',
                    )?.step;
                    const link = nextStep
                      ? `${routes.verification.name}#step-${nextStep}`
                      : routes.verification.name;

  // Verification snapshot — fetches per-step status + counts in one shot.
  // `reactQueryConfig.select` already unwraps res.data.data, so `data` is
  // the inner payload (`{ enabled, steps, submissions, counts, ... }`).
  // Failures are silent (the section just hides) so a broken module
  // doesn't break the whole profile page.
  const { data: verification } = useQuery(
    'verification-me',
    getMyVerification,
    { ...reactQueryConfig, retry: false },
  );
  const verificationEnabled = !!verification?.enabled;

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

  // Lifetime total this user has topped up their wallet with (sum of all
  // completed transactions for them).
  const [totalAdded, setTotalAdded] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMyAddedTotal();
        if (!cancelled) setTotalAdded(Number(res?.data?.data?.total) || 0);
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Per-card accent + icon animation. Tinting the card border/background
  // and the icon glyph itself keeps the row visually distinct without
  // disturbing the existing `profile-stat-card` skeleton.
  const PROFILE_ANIM_CSS = `
    @keyframes pp-float  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes pp-pulse  { 0%,100% { transform: scale(1); }       50% { transform: scale(1.12); } }
    @keyframes pp-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes pp-spin   { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes pp-shake  { 0%,100% { transform: translateX(0) rotate(0); }
                           25%     { transform: translateX(-2px) rotate(-6deg); }
                           75%     { transform: translateX(2px)  rotate(6deg); } }
    @keyframes pp-swing  { 0%,100% { transform: rotate(0); }
                           25%     { transform: rotate(15deg); }
                           75%     { transform: rotate(-15deg); } }
  `;

  const isReseller =
    String(authUser?.user_type || '').toLowerCase() === 'reseller';
  // Lifetime cashback (BDT) received across all completed orders. Mirrors
  // the admin reseller view's card. Hidden for normal users so the stats
  // grid stays at six tiles.
  const cashbackTotal = Number(authUser?.cashback_total || 0);

  return (
    <section className="mb-7">
      <style dangerouslySetInnerHTML={{ __html: PROFILE_ANIM_CSS }} />
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
              <h4 className="_h4 text-white drop-shadow flex items-center justify-center md:justify-start gap-2">
                {username}
                {/* "Verified" badge — only after all 4 verification steps
                    are admin-approved. Spec: "the user will see a
                    verified tag only after all the steps are verified."
                    Hidden when the module is off so non-verified sites
                    don't show an empty signal. */}
                {verificationEnabled && verification?.all_verified && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[11px] font-semibold backdrop-blur-sm"
                    title="All 4 verification steps approved"
                  >
                    ✓ Verified
                  </span>
                )}
              </h4>
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

      {/* Verification tag system. Only renders when the master toggle is
          on. Each tag is a clickable link to /profile/verification#step-N
          carrying the step's current status (verified / under review /
          rejected / not started). A summary chip on the left tells the
          user at a glance how many of the 4 steps are done. */}
      {verificationEnabled && (
              <div  className='container mt-8 hover:cursor-pointer' onClick={() => router.push(link)}>
      
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Account verification
                  </span>
                  {(() => {
                

                    return verification?.all_verified ? (
                      <button
                        type="button"
                        onClick={() => router.push(routes.verification.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 hover:bg-emerald-200 transition-colors"
                      >
                        ✓ Verified
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                          (verification?.counts?.verified || 0) > 0
                            ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {verification?.counts?.verified || 0} /{' '}
                        {verification?.counts?.total_steps || 4}
                      </button>
                    );
                  })()}
                </div>
               

                {/* Single progress bar with dynamic coloring */}
                <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      (() => {
                        const count = verification?.counts?.verified || 0;
                        if (verification?.all_verified || count >= 4) return 'bg-emerald-500';
                        if (count === 3) return 'bg-blue-500';
                        if (count === 2) return 'bg-amber-500';
                        if (count === 1) return 'bg-rose-500';
                        return 'bg-gray-300';
                      })()
                    }`}
                    style={{
                      width: `${
                        ((verification?.counts?.verified || 0) /
                          (verification?.counts?.total_steps || 4)) *
                        100
                      }%`,
                    }}
                  />
                </div>

                {/* {verification?.order_blocked && !verification?.all_verified && (
                  <div className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-rose-600 animate-pulse" />
                    Orders blocked until step 1 is verified
                  </div>
                )} */}
              </div>
            </div>
          </div>
      
</div>
      )}

      {/* Stats — five cards in a 5-col grid on lg, wrapping on smaller. */}
      <div className="container mt-14">
        <div className="grid grid-cols-1 xxs:grid-cols-2 lg:!grid-cols-5 gap-5 md:gap-7">
          {[
            {
              label: 'User Id',
              value: authUser?.id,
              delay: 60,
              icon: <FaIdBadge />,
              color: '#3b82f6', // blue
              anim: 'pp-float 3s ease-in-out infinite',
            },
            {
              label: 'Total Wallet',
              value: `৳ ${wallet || 0}`,
              delay: 120,
              icon: <FaWallet />,
              path: routes.addMoney.name,
              color: '#10b981', // emerald
              anim: 'pp-pulse 2s ease-in-out infinite',
            },
            {
              label: 'Total Added',
              value:
                totalAdded === null
                  ? '...'
                  : `৳ ${Number(totalAdded).toFixed(2)}`,
              delay: 150,
              icon: <FaPlusCircle />,
              path: routes.addMoney.name,
              color: '#8b5cf6', // violet
              anim: 'pp-bounce 1.6s ease-in-out infinite',
            },
            {
              label: 'Total Coins',
              value: coins,
              delay: 180,
              icon: <FaCoins />,
              path: routes.spin.name,
              accent: 'coin',
              color: '#f59e0b', // amber — also the coin-card brand
              anim: 'pp-spin 8s linear infinite',
            },
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
              color: '#ef4444', // red
              anim: 'pp-shake 2.6s ease-in-out infinite',
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
              color: '#06b6d4', // cyan
              anim: 'pp-swing 2.4s ease-in-out infinite',
            },
            // Reseller-only: lifetime cashback / cash reward credited. The
            // counter is bumped server-side by syncOrderCashbackForStatus
            // whenever an order completes, so this stays in sync without
            // an extra fetch.
            ...(isReseller
              ? [
                  {
                    label: 'Cashback / Rewards',
                    value: `৳ ${cashbackTotal.toFixed(2)}`,
                    delay: 360,
                    icon: <FaGift />,
                    color: '#ec4899', // pink
                    anim: 'pp-bounce 1.6s ease-in-out infinite',
                  },
                ]
              : []),
          ].map((stat) => {
            const isCoin = stat.accent === 'coin';
            return (
              <div
                key={stat.label}
                className={`profile-stat-card animate-fade-in-up ${stat.path ? 'cursor-pointer' : ''} ${isCoin ? 'profile-stat-card-coin' : ''}`}
                style={{
                  animationDelay: `${stat.delay}ms`,
                  borderTop: `3px solid ${stat.color}`,
                }}
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
                  <div
                    className={`profile-stat-icon ${isCoin ? 'is-coin' : ''}`}
                    style={
                      isCoin
                        ? { animation: stat.anim }
                        : {
                            color: stat.color,
                            background: `${stat.color}1a`,
                            animation: stat.anim,
                          }
                    }
                  >
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
