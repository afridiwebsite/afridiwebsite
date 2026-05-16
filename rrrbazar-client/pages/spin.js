/*
 * /spin — gacha wheel.
 *
 * Server defines the rewards (admin SiteSettings → SpinRewards), picks the
 * winner on `POST /spin/spin` and returns `reward_index`. The client renders
 * an SVG wheel with N pie segments, then animates the wheel rotation so that
 * the segment at `reward_index` lands under the pointer at the top.
 *
 * Also hosts the moved-in pieces: coin balance card, daily login bonus modal,
 * coin → wallet conversion form, and spin / coin history.
 */
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCoins, FaGift, FaHistory } from 'react-icons/fa';
import {
  convertCoins,
  doSpin,
  getCoinHistory,
  getMyCoins,
  getSpinHistory,
  getSpinOverview,
} from '../api/api';
import DailyLoginBonus from '../components/DailyLoginBonus';

const DEFAULT_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#facc15'];

function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function SpinWheel({ rewards, rotation, spinning, onSpin, disabled, ctaLabel }) {
  const size = 320;
  const r = size / 2;
  const segCount = Math.max(rewards.length, 1);
  const segAngle = 360 / segCount;

  return (
    <div className="spin-wheel-wrap">
      {/* Pointer */}
      <div className="spin-pointer" aria-hidden="true" />

      <div
        className={`spin-wheel ${spinning ? 'is-spinning' : ''}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="spin-svg">
          <defs>
            <radialGradient id="spin-hub">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
          </defs>

          {/* Outer ring background */}
          <circle cx={r} cy={r} r={r - 1} fill="#0f172a" />

          {/* Segments */}
          {rewards.map((reward, i) => {
            const start = i * segAngle;
            const end = start + segAngle;
            const color = reward.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const midAngle = start + segAngle / 2;
            const labelPos = polarToCartesian(r, r, r * 0.62, midAngle);
            const path = arcPath(r, r, r - 6, start, end);
            return (
              <g key={i}>
                <path d={path} fill={color} stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
                <g
                  transform={`translate(${labelPos.x} ${labelPos.y}) rotate(${midAngle})`}
                  style={{ pointerEvents: 'none' }}
                >
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize="13"
                    fontWeight="800"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                  >
                    {reward.label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Inner hub */}
          <circle cx={r} cy={r} r={36} fill="#fff" />
          <circle cx={r} cy={r} r={32} fill="url(#spin-hub)" />
        </svg>
      </div>

      <button
        type="button"
        onClick={onSpin}
        disabled={disabled}
        className={`spin-cta ${spinning ? 'is-spinning' : ''}`}
      >
        <span className="spin-cta-shine" aria-hidden="true" />
        <span className="spin-cta-text">{ctaLabel}</span>
      </button>
    </div>
  );
}

function SpinPage() {
  const [overview, setOverview] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [coinBusy, setCoinBusy] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');
  const [coinHistory, setCoinHistory] = useState([]);
  const [spinHistory, setSpinHistory] = useState([]);
  const [tab, setTab] = useState('spin'); // 'spin' | 'coin'
  const [lastWin, setLastWin] = useState(null);
  const rotationRef = useRef(0); // tracks the wheel's running rotation across spins

  const load = async () => {
    try {
      const res = await getSpinOverview();
      setOverview(res?.data?.data || null);
    } catch (e) { /* ignore */ }
    try {
      const h = await getSpinHistory();
      setSpinHistory(h?.data?.data || []);
    } catch (e) { /* ignore */ }
    try {
      const ch = await getCoinHistory();
      setCoinHistory(ch?.data?.data || []);
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const rewards = useMemo(() => overview?.rewards || [], [overview]);
  const segCount = Math.max(rewards.length, 1);
  const segAngle = 360 / segCount;

  const cost = overview?.cost || 0;
  const dailyLimit = overview?.daily_limit || 0;
  const spinsToday = overview?.spins_today || 0;
  const coins = overview?.coins || 0;
  const rate = Number(overview?.coin_to_money_rate) || 0;
  const overLimit = dailyLimit > 0 && spinsToday >= dailyLimit;
  const cannotAfford = cost > 0 && coins < cost;

  // Live preview shown on the Convert button — recomputes as the user types.
  // Two-decimal display so partial-paisa values are visible (1 coin × 0.01 BDT
  // = 0.01 instead of being rounded to 0).
  const convertPreview = (() => {
    const n = Number(convertAmount);
    if (!n || n <= 0) return '';
    const money = (n * rate).toFixed(2);
    return ` ${n} → ৳ ${money}`;
  })();

  const onSpin = async () => {
    if (spinning || rewards.length === 0) return;
    if (overLimit) return toast.error('Daily spin limit reached');
    if (cannotAfford) return toast.error(`Need ${cost} coins to spin`);

    setSpinning(true);
    setLastWin(null);
    try {
      const res = await doSpin();
      const data = res?.data?.data;
      const idx = data?.reward_index ?? 0;

      // Compute the rotation. Segment i's centre sits at i*segAngle + segAngle/2
      // measured clockwise from the top, so the wheel must rotate by
      // -(centre) to align that segment with the pointer at 0deg. Add a few
      // full rotations for drama, plus a tiny random offset so consecutive
      // spins don't look identical.
      const centre = idx * segAngle + segAngle / 2;
      const jitter = (Math.random() - 0.5) * (segAngle * 0.4);
      // Always rotate forward from the last position so the motion looks
      // natural even if the same segment wins twice in a row.
      const currentMod = ((rotationRef.current % 360) + 360) % 360;
      const targetMod = ((360 - centre) % 360 + 360) % 360;
      const delta = ((targetMod - currentMod) + 360) % 360;
      const extraSpins = 6 * 360; // 6 full turns
      const next = rotationRef.current + extraSpins + delta + jitter;
      rotationRef.current = next;
      setRotation(next);

      // Wait for the CSS transition to finish (must match .spin-wheel
      // transition-duration).
      setTimeout(async () => {
        setSpinning(false);
        setLastWin(data?.reward);
        toast.success(res?.data?.message || 'Spin complete');
        await load();
      }, 4200);
    } catch (e) {
      setSpinning(false);
      toast.error(e?.response?.data?.message || 'Spin failed');
    }
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
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Convert failed');
    } finally { setCoinBusy(false); }
  };

  const remaining = dailyLimit > 0 ? Math.max(0, dailyLimit - spinsToday) : null;
  const ctaLabel = spinning
    ? 'Spinning…'
    : cost > 0
      ? `Spin (-${cost} coins)`
      : 'SPIN';

  return (
    <>
      <Head>
        <title>Spin & Win</title>
      </Head>

      <DailyLoginBonus
        open={bonusOpen}
        onClose={() => setBonusOpen(false)}
        onClaimed={load}
      />

      <section className="container my-6 spin-page">
        <header className="spin-header animate-fade-in-up">
          <div>
            <h1 className="spin-title">Spin &amp; Win</h1>
            <p className="spin-sub">Try your luck on the wheel — rewards are funded by the admin.</p>
          </div>
          <div className="spin-stats">
            <div className="spin-stat">
              <FaCoins className="spin-stat-icon" />
              <div>
                <div className="spin-stat-value">{coins}</div>
                <div className="spin-stat-label">Coins</div>
              </div>
            </div>
            {/* <button
              type="button"
              onClick={() => setBonusOpen(true)}
              className="spin-bonus-btn"
            >
              <FaGift />
              <span>Daily bonus</span>
            </button> */}
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr,360px] gap-7 mt-6">
          {/* Wheel column */}
          <div className="spin-card animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            {rewards.length === 0 ? (
              <div className="spin-empty">
                No rewards configured yet. An admin can add some under{' '}
                <strong>Site Settings → Spin Rewards</strong>.
              </div>
            ) : (
              <SpinWheel
                rewards={rewards}
                rotation={rotation}
                spinning={spinning}
                onSpin={onSpin}
                disabled={spinning || cannotAfford || overLimit}
                ctaLabel={overLimit ? 'Come back tomorrow' : cannotAfford ? `Need ${cost} coins` : ctaLabel}
              />
            )}

            <div className="spin-meta">
              {dailyLimit > 0 && (
                <span className="spin-chip">
                  Remaining today: <strong>{remaining}</strong> / {dailyLimit}
                </span>
              )}
              {cost > 0 && (
                <span className="spin-chip">
                  Cost per spin: <strong>{cost}</strong> coins
                </span>
              )}
            </div>

            {lastWin && (
              <div className="spin-last animate-pop-in">
                <span className="spin-last-emoji">🎉</span>
                You won <strong>{lastWin.label}</strong>
              </div>
            )}
          </div>

          {/* Side: coin balance banner + convert form (mirrors the old
              profile layout: golden header with the floating coin, balance,
              and live-preview convert form below). */}
          <aside className="flex flex-col gap-5">
            <div className="profile-coin-card animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="profile-coin-banner">
                <div className="profile-coin-banner-content">
                  <div className="profile-coin-emoji" aria-hidden="true">🪙</div>
                  <div>
                    <p className="profile-coin-banner-label">My Coins</p>
                    <p className="profile-coin-balance">{coins}</p>
                    <p className="profile-coin-sub">≈ {(coins * rate).toFixed(2)} BDT</p>
                  </div>
                </div>
              </div>
              <form onSubmit={onConvert} className="profile-coin-actions">
                <p className="profile-convert-title">Convert coins to wallet</p>
                <p className="profile-convert-rate mb-2">
                  1 coin = <strong>{rate}</strong> BDT
                </p>
                <input
                  type="number"
                  min="1"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder="Coins to convert"
                  className="profile-convert-input mb-2"
                />
                <button
                  type="submit"
                  disabled={coinBusy || !convertAmount}
                  className="profile-convert-btn mb-3"
                >
                  Convert{convertPreview}
                </button>
                <Link href="/add-money">
                  <a className="text-xs text-gray-500 mt-2 text-center hover:text-gray-700">
                    Or top up your wallet directly →
                  </a>
                </Link>
              </form>
            </div>
          </aside>
        </div>

        {/* History tabs */}
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <div className="spin-tabs">
            <button
              type="button"
              onClick={() => setTab('spin')}
              className={`spin-tab ${tab === 'spin' ? 'is-active' : ''}`}
            >
              <FaHistory /> Spin history
            </button>
            <button
              type="button"
              onClick={() => setTab('coin')}
              className={`spin-tab ${tab === 'coin' ? 'is-active' : ''}`}
            >
              <FaCoins /> Coin activity
            </button>
          </div>

          <div className="profile-history-card !rounded-t-none">
            <div className="overflow-x-auto">
              {tab === 'spin' ? (
                <table className="profile-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reward</th>
                      <th>Type</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spinHistory.length === 0 && (
                      <tr><td colSpan={4} className="profile-history-empty">No spins yet.</td></tr>
                    )}
                    {spinHistory.map((h, i) => (
                      <tr key={h.id} className="profile-history-row" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                        <td>{new Date(h.created_at).toLocaleString()}</td>
                        <td className="font-semibold text-gray-800">{h.label}</td>
                        <td className="capitalize">{h.type}</td>
                        <td className={`text-right font-bold ${h.amount > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {h.amount > 0 ? `+${h.amount}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
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
                      <tr><td colSpan={4} className="profile-history-empty">No coin activity yet.</td></tr>
                    )}
                    {coinHistory.map((h, i) => (
                      <tr key={h.id} className="profile-history-row" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
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
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

SpinPage.auth = true;
export default SpinPage;
