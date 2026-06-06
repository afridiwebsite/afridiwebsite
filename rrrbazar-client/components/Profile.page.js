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

  // Verification snapshot — fetches per-step status + counts in one shot.
  // Used to render the tag system below; failures are silent (the section
  // just hides) so a broken module doesn't break the whole profile page.
  const { data: verificationResp } = useQuery(
    'verification-me',
    getMyVerification,
    { ...reactQueryConfig, retry: false },
  );
  const verification = verificationResp?.data?.data;
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

      {/* Verification tag system. Only renders when the master toggle is
          on. Each tag is a clickable link to /profile/verification#step-N
          carrying the step's current status (verified / under review /
          rejected / not started). A summary chip on the left tells the
          user at a glance how many of the 4 steps are done. */}
      {verificationEnabled && (
        <div className="container mt-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <div className="text-sm text-gray-500">Account verification</div>
                <div className="text-base font-bold text-gray-800">
                  {verification?.all_verified ? (
                    <span className="text-emerald-700">Fully verified ✓</span>
                  ) : (
                    <>
                      {verification?.counts?.verified || 0} of{' '}
                      {verification?.counts?.total_steps || 4} steps verified
                    </>
                  )}
                </div>
                {verification?.order_blocked && (
                  <div className="text-xs text-red-700 mt-1 font-semibold">
                    Orders are blocked until step 1 is verified.
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => router.push(routes.verification.name)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded"
              >
                Open verification page
              </button>
            </div>

            {/* Per-step tags. Server already returned a per-step submission
                map keyed by step number; we walk it to colour each tag.
                Clicking a tag deep-links to the relevant step form. */}
            <div className="flex flex-wrap gap-2">
              {(verification?.steps || []).map((step) => {
                const sub = verification?.submissions?.[String(step.step)];
                const status = sub?.status || 'not_started';
                const styles = {
                  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  under_review: 'bg-amber-100 text-amber-800 border-amber-200',
                  rejected: 'bg-red-100 text-red-800 border-red-200',
                  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
                }[status];
                const label = {
                  verified: 'Verified',
                  under_review: 'Under review',
                  rejected: 'Rejected',
                  not_started: 'Not started',
                }[status];
                return (
                  <button
                    type="button"
                    key={step.step}
                    onClick={() =>
                      router.push(`${routes.verification.name}#step-${step.step}`)
                    }
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${styles}`}
                    title={`Step ${step.step}: ${step.title}`}
                  >
                    <span className="font-bold">#{step.step}</span>
                    <span>{step.title}</span>
                    <span className="opacity-60">·</span>
                    <span>{label}</span>
                  </button>
                );
              })}
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
