/*
 *
 * Title: Profile.page
 * Description: User profile + coin wallet (claim/convert/history).
 *
 */
import { useContext, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import {
  claimCoins,
  convertCoins,
  getCoinHistory,
  getMyCoins,
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

  // Coin state (lifted from the deleted /coins page)
  const [coinData, setCoinData] = useState(null);
  const [coinHistory, setCoinHistory] = useState([]);
  const [coinBusy, setCoinBusy] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');

  const loadCoins = async () => {
    try {
      const res = await getMyCoins();
      setCoinData(res?.data?.data || null);
    } catch (e) { /* swallow */ }
    try {
      const h = await getCoinHistory();
      setCoinHistory(h?.data?.data || []);
    } catch (e) { /* swallow */ }
  };
  useEffect(() => { loadCoins(); }, []);

  const onClaim = async () => {
    setCoinBusy(true);
    try {
      const res = await claimCoins();
      toast.success(res?.data?.message || 'Coins claimed');
      await loadCoins();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not claim');
    } finally { setCoinBusy(false); }
  };

  const onConvert = async (e) => {
    e.preventDefault();
    const amt = Number(convertAmount);
    if (!amt || amt <= 0) return;
    setCoinBusy(true);
    try {
      const res = await convertCoins(amt);
      toast.success(res?.data?.message || 'Converted');
      setConvertAmount('');
      await loadCoins();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Convert failed');
    } finally { setCoinBusy(false); }
  };

  const coins = coinData?.coins || 0;
  const rate = coinData?.coin_to_money_rate || 0;
  const canClaim = !!coinData?.can_claim;
  const nextReward = coinData?.next_reward || coinData?.daily_claim_amount || 0;

  return (
    <>
      <section className="mb-7">
        {/* Hero banner */}

        <div className='relative md:container animate-fade-in h-[200px] md:h-[140px] mt-2' > 
        <div
          className="profile-hero lg:rounded-lg h-full"
          style={{
            backgroundImage: `
              linear-gradient(0deg, rgba(0,0,0,0.65), rgba(0,0,0,0.15)),
              url(/profile-banners/${randomNumber}.jpg)
            `,
          }}
        >
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center md:items-end md:justify-between  pb-5 absolute md:left-10 md:-bottom-10 left-0 right-0 m-auto top-1">
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
                <button
                  onClick={() => router.push(routes.settings.name)}
                  className="profile-hero-btn"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mt-14">
          {/* Stats — full width now that User Info block is gone */}
          <div className="grid grid-cols-1 xxs:grid-cols-2 lg:!grid-cols-4 gap-5 md:gap-7">
            {[
              { label: 'User Id',     value: authUser?.id,           delay: 60 },
              { label: 'Total Wallet', value: `৳ ${wallet || 0}`,     delay: 120 },
              {
                label: 'Total Spent',
                value: (
                  <>
                    <OnlyIconActivityIndicator
                      data={ordersData?.totalSpent}
                      loading={isLoading}
                      error={isError && error}
                    />
                    {ordersData?.totalSpent && '৳ ' + ordersData?.totalSpent}
                  </>
                ),
                delay: 180,
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
                delay: 240,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="profile-stat-card animate-fade-in-up"
                style={{ animationDelay: `${stat.delay}ms` }}
              >
                <p className="profile-stat-value">{stat.value}</p>
                <p className="profile-stat-label">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Coins section */}
          <div
            className="mt-7 grid md:grid-cols-[1.1fr,1fr] gap-5 md:gap-7 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            {/* Balance + claim */}
            <div className="profile-coin-card">
              <div className="profile-coin-banner">
                <div className="profile-coin-banner-content">
                  <div className="profile-coin-emoji" aria-hidden="true">🪙</div>
                  <div>
                    <p className="profile-coin-banner-label">My Coins</p>
                    <p className="profile-coin-balance">{coins}</p>
                    <p className="profile-coin-sub">≈ {Math.floor(coins * rate)} BDT</p>
                  </div>
                </div>
              </div>
              <div className="profile-coin-actions">
                <button
                  type="button"
                  onClick={onClaim}
                  disabled={!canClaim || coinBusy}
                  className="profile-coin-claim"
                >
                  {canClaim
                    ? `Claim ${nextReward} daily coins`
                    : 'Already claimed today'}
                </button>
                {!canClaim && coinData?.next_claim_at && (
                  <p className="profile-coin-next">
                    Next claim {new Date(coinData.next_claim_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Convert form */}
            <form onSubmit={onConvert} className="profile-convert-card">
              <p className="profile-convert-title">Convert coins to wallet</p>
              <p className="profile-convert-rate">
                1 coin = <strong>{rate}</strong> BDT
              </p>
              <input
                type="number"
                min="1"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                placeholder="Coins to convert"
                className="profile-convert-input"
              />
              <button
                type="submit"
                disabled={coinBusy || !convertAmount}
                className="profile-convert-btn"
              >
                Convert {convertAmount ? `${convertAmount} → ৳ ${Math.floor(Number(convertAmount) * rate) || 0}` : ''}
              </button>
            </form>
          </div>

          {/* History */}
          <div
            className="profile-history-card mt-6 animate-fade-in-up"
            style={{ animationDelay: '360ms' }}
          >
            <div className="profile-history-header">
              <h3 className="_h5">Coin Activity</h3>
              <span className="profile-history-count">
                {coinHistory.length} entries
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="profile-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="text-right">Amount</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {coinHistory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="profile-history-empty">
                        No coin activity yet.
                      </td>
                    </tr>
                  )}
                  {coinHistory.map((h, i) => (
                    <tr
                      key={h.id}
                      className="profile-history-row"
                      style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                    >
                      <td>{new Date(h.created_at).toLocaleString()}</td>
                      <td className="capitalize">{h.type}</td>
                      <td className={`text-right font-bold ${h.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {h.amount > 0 ? '+' : ''}{h.amount}
                      </td>
                      <td className="text-gray-500">{h.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ProfilePage;
