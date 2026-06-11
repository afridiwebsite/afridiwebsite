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
import Head from "next/head";
import Link from "next/link";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactHtmlParser from "react-html-parser";
import { toast } from "react-toastify";
import { FaCoins, FaGift, FaHistory } from "react-icons/fa";
import {
  convertCoins,
  doSpin,
  getCoinHistory,
  getMyCoins,
  getSpinHistory,
  getGlobalSpinHistory,
  getSpinOverview,
} from "../api/api";
import DailyLoginBonus from "../components/DailyLoginBonus";
import { globalContext } from "./_app";

const DEFAULT_COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#facc15",
];

// Format a seconds count as H:MM:SS (hours dropped when zero) for the
// "next spin available" countdown shown once the daily quota is used up.
function formatSpinCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// Pick a font size and label-character budget based on how many slices the
// wheel has. As slices get thinner the available arc length for the label
// shrinks, so we both shrink the font and trim/truncate the label.
// Labels are drawn radially (running from hub toward rim), so the limiting
// dimension is the segment's arc width — but since the wheel itself got
// larger we can afford a chunkier font.
function pickWheelTextStyle(segCount) {
  if (segCount <= 6) return { fontSize: 20, maxChars: 13 };
  if (segCount <= 8) return { fontSize: 18, maxChars: 11 };
  if (segCount <= 10) return { fontSize: 16, maxChars: 10 };
  if (segCount <= 14) return { fontSize: 14, maxChars: 8 };
  if (segCount <= 18) return { fontSize: 12, maxChars: 6 };
  return { fontSize: 10, maxChars: 5 };
}

// Admin authors reward labels as HTML in the TextEditor, but the wheel
// renders inside an <svg><text>, which doesn't understand markup — so
// strip tags + decode the common entities before truncating. The rich
// version is still shown in the "You won" banner and the spin history.
function labelToPlain(label) {
  return String(label || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateLabel(label, maxChars) {
  const s = labelToPlain(label);
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(maxChars - 1, 1)) + "…";
}

function SpinWheel({
  rewards,
  rotation,
  spinning,
  onSpin,
  disabled,
  ctaLabel,
}) {
  // `size` is the SVG's internal coordinate system (used for radii,
  // label positions, etc.) — NOT the rendered pixel size. The rendered
  // size is driven by CSS clamp() below, which shrinks the wheel on
  // small viewports. viewBox keeps every internal coordinate in sync
  // so the labels, hub, and pointer-bead stay aligned at any width.
  const size = 440;
  const r = size / 2;
  const segCount = Math.max(rewards.length, 1);
  const segAngle = 360 / segCount;
  const { fontSize, maxChars } = pickWheelTextStyle(segCount);

  return (
    <div className="spin-wheel-wrap">
      {/* Pointer — inline SVG so the gradient + drop-shadow tip-light
          all stay crisp at any zoom, and the tip can overlap the wheel
          rim for a "locked-in" pin look. clamp() shrinks it in lockstep
          with the wheel so it doesn't dwarf the rim on mobile. */}
      <svg
        className="spin-pointer"
        viewBox="0 0 56 78"
        aria-hidden="true"
        focusable="false"
        style={{ width: "clamp(30px, 7vw, 44px)" }}
      >
        <defs>
          <linearGradient id="spin-pointer-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <radialGradient id="spin-pointer-hi" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Teardrop pin: rounded shoulders at the top, sharp tip at
            the bottom that sits just inside the wheel rim. */}
        <path
          d="M28 76 L4 28 Q4 4 28 4 Q52 4 52 28 Z"
          fill="url(#spin-pointer-body)"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Soft specular highlight near the top of the pin */}
        <ellipse cx="28" cy="22" rx="14" ry="8" fill="url(#spin-pointer-hi)" />
        {/* Small bead at the very tip so the pointer "locks" onto a slice */}
        <circle cx="28" cy="72" r="3.5" fill="#ffffff" />
      </svg>

      <div
        className={`spin-wheel ${spinning ? "is-spinning" : ""}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Rendered width follows clamp(min, fluid, max):
              - phones (~360px wide): 88vw ≈ 317px → caps at 280px floor on
                tiny viewports, otherwise scales fluidly
              - tablets / large phones: 88vw fills nicely
              - desktop: caps at 440px so the wheel doesn't blow past its
                column
            Internal viewBox stays at 440 so labels + geometry are unchanged. */}
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="spin-svg"
          style={{ width: "clamp(280px, 88vw, 440px)", height: "auto" }}
        >
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
            const color =
              reward.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const midAngle = start + segAngle / 2;
            // Labels now run RADIALLY (from hub toward rim) instead of
            // tangentially around the ring. Rotation = midAngle - 90
            // aligns the text's reading direction with the radial line
            // for each segment; left-half segments end up reading
            // bottom-up, right-half top-down — the standard fortune-
            // wheel look.
            const labelPos = polarToCartesian(r, r, r * 0.6, midAngle);
            const path = arcPath(r, r, r - 6, start, end);
            return (
              <g key={i}>
                <path
                  d={path}
                  fill={color}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="2"
                />
                <g
                  transform={`translate(${labelPos.x} ${labelPos.y}) rotate(${midAngle - 90})`}
                  style={{ pointerEvents: "none" }}
                >
                  <foreignObject
                    x={-80}
                    y={-fontSize * 1.5}
                    width={160}
                    height={fontSize * 3.5}
                  >
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        fontSize: `${fontSize}px`,
                        fontWeight: "900",
                        color: "#fff",
                        lineHeight: "1.1",
                        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                        overflow: "hidden",
                        padding: "0 4px",
                      }}
                    >
                      {ReactHtmlParser(reward.label)}
                    </div>
                  </foreignObject>
                </g>
              </g>
            );
          })}

          {/* Inner hub */}
          <circle cx={r} cy={r} r={44} fill="#fff" />
          <circle cx={r} cy={r} r={40} fill="url(#spin-hub)" />
        </svg>
      </div>

      <button
        type="button"
        onClick={onSpin}
        disabled={disabled}
        className={`spin-cta ${spinning ? "is-spinning" : ""}`}
      >
        <span className="spin-cta-shine" aria-hidden="true" />
        <span className="spin-cta-text">{ctaLabel}</span>
      </button>
    </div>
  );
}

function SpinPage() {
  const { authUser, updateAuthUserInfo } = useContext(globalContext);
  const [overview, setOverview] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [coinBusy, setCoinBusy] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");
  const [coinHistory, setCoinHistory] = useState([]);
  const [spinHistory, setSpinHistory] = useState([]); // global feed
  const [mySpinHistory, setMySpinHistory] = useState([]); // current user
  const [tab, setTab] = useState("spin"); // 'spin' | 'mySpin' | 'coin'
  const [lastWin, setLastWin] = useState(null);
  const rotationRef = useRef(0); // tracks the wheel's running rotation across spins

  const load = useCallback(
    async (includeOverview = true) => {
      if (includeOverview) {
        try {
          const res = await getSpinOverview();
          const data = res?.data?.data;
          setOverview(data || null);
          // Sync global state if it differs (e.g. on first load)
          if (data && updateAuthUserInfo && authUser) {
            if (data.coins !== authUser.coins) {
              updateAuthUserInfo({ ...authUser, coins: data.coins });
            }
          }
        } catch (e) {
          /* ignore */
        }
      }
      try {
        const gh = await getGlobalSpinHistory();
        setSpinHistory(gh?.data?.data || []);
      } catch (e) {
        /* ignore */
      }
      try {
        const mh = await getSpinHistory();
        setMySpinHistory(mh?.data?.data || []);
      } catch (e) {
        /* ignore */
      }
      try {
        const ch = await getCoinHistory();
        setCoinHistory(ch?.data?.data || []);
      } catch (e) {
        /* ignore */
      }
    },
    [authUser, updateAuthUserInfo],
  );

  useEffect(() => {
    load();
  }, [load]);

  const rewards = useMemo(() => overview?.rewards || [], [overview]);
  const segCount = Math.max(rewards.length, 1);
  const segAngle = 360 / segCount;

  console.log(overview);

  const cost = overview?.cost || 0;
  const dailyLimit = overview?.daily_limit || 0;
  const spinsToday = overview?.spins_today || 0;
  const coins = authUser?.coins ?? overview?.coins ?? 0;
  const rate = Number(overview?.coin_to_money_rate) || 0;
  const minConvert = Number(overview?.min_convert_coins) || 0;
  const overLimit = dailyLimit > 0 && spinsToday >= dailyLimit;
  const cannotAfford = cost > 0 && coins < cost;

  // Live countdown to when the daily quota frees up again. The server sends
  // `next_spin_at` (ISO) only when the user is currently capped; we tick it
  // down every second and auto-refresh the overview once it elapses so the
  // wheel re-enables itself without a manual reload.
  const nextSpinAt = overview?.next_spin_at || null;
  const [spinCountdown, setSpinCountdown] = useState(0);
  useEffect(() => {
    if (!nextSpinAt) {
      setSpinCountdown(0);
      return undefined;
    }
    const target = new Date(nextSpinAt).getTime();
    let id;
    const tick = () => {
      const left = Math.max(0, Math.round((target - Date.now()) / 1000));
      setSpinCountdown(left);
      if (left <= 0) {
        clearInterval(id);
        load(); // window rolled — pull a fresh overview to unlock the wheel
      }
    };
    id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [nextSpinAt, load]);

  // Live preview shown on the Convert button — recomputes as the user types.
  // Two-decimal display so partial-paisa values are visible (1 coin × 0.01 BDT
  // = 0.01 instead of being rounded to 0).
  const convertPreview = (() => {
    const n = Number(convertAmount);
    if (!n || n <= 0) return "";
    const money = (n * rate).toFixed(2);
    return ` ${n} → ৳ ${money}`;
  })();

  const onSpin = async () => {
    if (spinning || rewards.length === 0) return;
    if (overLimit) return toast.error("Daily spin limit reached");
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
      const targetMod = (((360 - centre) % 360) + 360) % 360;
      const delta = (targetMod - currentMod + 360) % 360;
      const extraSpins = 6 * 360; // 6 full turns
      const next = rotationRef.current + extraSpins + delta + jitter;
      rotationRef.current = next;
      setRotation(next);

      // Defer EVERYTHING reward-related (coin balance update, toast, reveal
      // banner, history reload) until the wheel actually stops — otherwise
      // the user sees their coin count change and the toast pop while the
      // wheel is still spinning, which spoils the reveal.
      setTimeout(async () => {
        if (updateAuthUserInfo && authUser) {
          updateAuthUserInfo({
            ...authUser,
            coins: data.coins,
            wallet: data.wallet ?? authUser.wallet,
          });
        }
        setSpinning(false);
        setLastWin(data?.reward);
        toast.success(
          <div>{ReactHtmlParser(res?.data?.message || "Spin complete")}</div>,
        );
        await load(false); // Only reload history, keep balance from response
      }, 4200);
    } catch (e) {
      setSpinning(false);
      toast.error(e?.response?.data?.message || "Spin failed");
    }
  };

  const onConvert = async (e) => {
    e.preventDefault();
    const amt = Number(convertAmount);
    if (!amt || amt <= 0) return;
    setCoinBusy(true);
    try {
      const res = await convertCoins(amt);
      const data = res?.data?.data;

      // Immediate wallet and coin update in Header
      if (data && updateAuthUserInfo && authUser) {
        updateAuthUserInfo({
          ...authUser,
          coins: data.coins,
          wallet: data.wallet,
        });
      }

      toast.success(res?.data?.message || "Converted");
      setConvertAmount("");
      await load(false); // Reload history only
    } catch (err) {
      toast.error(err?.response?.data?.message || "Convert failed");
    } finally {
      setCoinBusy(false);
    }
  };

  const remaining =
    dailyLimit > 0 ? Math.max(0, dailyLimit - spinsToday) : null;
  const ctaLabel = spinning
    ? "Spinning…"
    : cost > 0
      ? `Spin (-${cost} coins)`
      : "SPIN";

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
            <p className="spin-sub">
              Try your luck on the wheel — rewards are funded by the admin.
            </p>
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
          <div
            className="spin-card animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
          >
            {rewards.length === 0 ? (
              <div className="spin-empty">
                No rewards configured yet. An admin can add some under{" "}
                <strong>Site Settings → Spin Rewards</strong>.
              </div>
            ) : (
              <SpinWheel
                rewards={rewards}
                rotation={rotation}
                spinning={spinning}
                onSpin={onSpin}
                disabled={spinning || cannotAfford || overLimit}
                ctaLabel={
                  overLimit
                    ? spinCountdown > 0
                      ? `Next spin in ${formatSpinCountdown(spinCountdown)}`
                      : "Come back tomorrow"
                    : cannotAfford
                      ? `Need ${cost} coins`
                      : ctaLabel
                }
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
              {overLimit && spinCountdown > 0 && (
                <span className="spin-chip">
                  Next spin in{" "}
                  <strong>{formatSpinCountdown(spinCountdown)}</strong>
                </span>
              )}
            </div>

            {lastWin && (
              <div className="spin-last animate-pop-in">
                <span className="spin-last-emoji">🎉</span>
                You won{" "}
                <strong className="spin-last-label">
                  {ReactHtmlParser(String(lastWin.label || ""))}
                </strong>
              </div>
            )}
          </div>

          {/* Side: coin balance banner + convert form (mirrors the old
              profile layout: golden header with the floating coin, balance,
              and live-preview convert form below). */}
          <aside className="flex flex-col gap-5">
            <div
              className="profile-coin-card animate-fade-in-up"
              style={{ animationDelay: "120ms" }}
            >
              <div className="profile-coin-banner">
                <div className="profile-coin-banner-content">
                  <div className="profile-coin-emoji" aria-hidden="true">
                    🪙
                  </div>
                  <div>
                    <p className="profile-coin-banner-label">My Coins</p>
                    <p className="profile-coin-balance">{coins}</p>
                    <p className="profile-coin-sub">
                      ≈ {(coins * rate).toFixed(2)} BDT
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={onConvert} className="profile-coin-actions">
                <p className="profile-convert-title">Convert coins to wallet</p>
                <p className="profile-convert-rate mb-2">
                  1 coin = <strong>{rate}</strong> BDT
                  {minConvert > 0 && (
                    <>
                      <br />
                      Minimum: <strong>{minConvert}</strong> coins
                    </>
                  )}
                </p>
                <input
                  type="number"
                  min={minConvert > 0 ? minConvert : 1}
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
        <div
          className="mt-8 animate-fade-in-up"
          style={{ animationDelay: "180ms" }}
        >
          <div className="spin-tabs">
            <button
              type="button"
              onClick={() => setTab("spin")}
              className={`spin-tab ${tab === "spin" ? "is-active" : ""}`}
            >
              <FaHistory /> Spin history
            </button>
            <button
              type="button"
              onClick={() => setTab("mySpin")}
              className={`spin-tab ${tab === "mySpin" ? "is-active" : ""}`}
            >
              <FaHistory /> My spins
            </button>
            <button
              type="button"
              onClick={() => setTab("coin")}
              className={`spin-tab ${tab === "coin" ? "is-active" : ""}`}
            >
              <FaCoins /> Coin activity
            </button>
          </div>

          <div className="profile-history-card !rounded-t-none">
            <div className="overflow-x-auto">
              {tab === "spin" ? (
                <table className="profile-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Reward</th>
                      <th>Type</th>
                      <th className="!text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spinHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="profile-history-empty">
                          No spins yet.
                        </td>
                      </tr>
                    )}
                    {spinHistory.map((h, i) => (
                      <tr
                        key={h.id}
                        className="profile-history-row"
                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                      >
                        <td>{new Date(h.created_at).toLocaleString()}</td>
                        <td className="text-gray-700">
                          {h.player_name || `User #${h.user_id}`}
                        </td>
                        <td className="font-semibold text-gray-800">
                          {ReactHtmlParser(String(h.label || ""))}
                        </td>
                        <td className="capitalize">{h.type}</td>
                        <td
                          className={`text-right font-bold ${h.amount > 0 ? "text-emerald-600" : "text-gray-500"}`}
                        >
                          {h.amount > 0 ? `+${h.amount}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : tab === "mySpin" ? (
                <table className="profile-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reward</th>
                      <th>Type</th>
                      <th className="!text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mySpinHistory.length === 0 && (
                      <tr>
                        <td colSpan={4} className="profile-history-empty">
                          You haven&apos;t spun yet.
                        </td>
                      </tr>
                    )}
                    {mySpinHistory.map((h, i) => (
                      <tr
                        key={h.id}
                        className="profile-history-row"
                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                      >
                        <td>{new Date(h.created_at).toLocaleString()}</td>
                        <td className="font-semibold text-gray-800">
                          {ReactHtmlParser(String(h.label || ""))}
                        </td>
                        <td className="capitalize">{h.type}</td>
                        <td
                          className={`text-right font-bold ${h.amount > 0 ? "text-emerald-600" : "text-gray-500"}`}
                        >
                          {h.amount > 0 ? `+${h.amount}` : "—"}
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
                      <th className="!text-right">Amount</th>
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
                        <td
                          className={`text-right font-bold ${h.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {h.amount > 0 ? "+" : ""}
                          {h.amount}
                        </td>
                        <td className="text-gray-500">
                          {ReactHtmlParser(String(h.note || ""))}
                        </td>
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
